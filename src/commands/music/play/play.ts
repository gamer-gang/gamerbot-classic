import { Message, StreamOptions, TextChannel, VoiceChannel } from 'discord.js';
import _ from 'lodash';
import { Duration } from 'luxon';
import miniget from 'miniget';
import * as mm from 'music-metadata';
import { Command, CommandDocs } from '../..';
import { client, getLogger } from '../../../providers';
import { Context, FileTrack, Track } from '../../../types';
import { codeBlock, Embed, normalizeDuration, regExps } from '../../../util';
import { getSpotifyAlbum } from './spotify/album';
import { getSpotifyPlaylist } from './spotify/playlist';
import { getSpotifyTrack } from './spotify/track';
import { getYoutubeChannel } from './youtube/channel';
import { getYoutubePlaylist } from './youtube/playlist';
import { searchYoutube } from './youtube/search';
import { getYoutubeVideo } from './youtube/video';

const handlers: {
  [key: string]: [RegExp, (context: Context, caller: CommandPlay) => Promise<void | Message>];
} = {
  youtubeChannel: [regExps.youtube.channel, getYoutubeChannel],
  youtubePlaylist: [regExps.youtube.playlist, getYoutubePlaylist],
  youtubeVideo: [regExps.youtube.video, getYoutubeVideo],
  spotifyPlaylist: [regExps.spotify.playlist, getSpotifyPlaylist],
  spotifyAlbum: [regExps.spotify.album, getSpotifyAlbum],
  spotifyTrach: [regExps.spotify.track, getSpotifyTrack],
};

const sortAliases = {
  newest: ['newest', 'recent'],
  oldest: ['oldest'],
  views: ['views', 'popularity'],
  random: ['random', 'shuffle'],
};

export class CommandPlay implements Command {
  cmd = ['play', 'p'];
  docs: CommandDocs = [
    {
      usage: ['play <url> [--sort <type>]'],
      description:
        'play youtube video from a video/playlist/channel url; must not be private\n' +
        'use --sort to order playlist and channel videos or search results',
    },
    {
      usage: ['play <...searchString>'],
      description: 'search for a video and choose from the top 5 results',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const voice = msg.member?.voice;
    if (!voice?.channel) return msg.channel.send(Embed.error('You are not in a voice channel'));
    if (msg.guild.me?.voice.channelID && msg.guild.me.voice.channelID !== voice.channelID)
      return msg.channel.send(Embed.error('You are not in the channel'));

    const queue = client.queues.get(msg.guild.id);

    const permissions = voice.channel.permissionsFor(client.user?.id as string);
    if (!permissions?.has('CONNECT'))
      return msg.channel.send(Embed.error("Can't connect to channel"));
    if (!permissions?.has('SPEAK')) return msg.channel.send(Embed.error("Can't speak in channel"));

    if (!args._[0]) {
      // check for uploaded files
      if (msg.attachments.size) {
        const attachment = msg.attachments.array()[0];
        const metadata = await mm.parseStream(miniget(attachment.url));

        this.queueTrack(
          new FileTrack(msg.author?.id as string, {
            title: (attachment.name || _.last(attachment.url.split('/'))) ?? 'Unknown',
            url: attachment.url,
            duration: normalizeDuration(Duration.fromObject({ seconds: metadata.format.duration })),
          }),
          { context }
        );

        return;
      }

      if (queue?.voiceConnection?.dispatcher?.paused) {
        queue.voiceConnection?.dispatcher.resume();
        queue.paused = false;
        queue.updateNowPlaying();
        return msg.channel.send(Embed.success('Resumed'));
      }

      if (!queue.playing && queue.tracks.length) {
        queue.index = 0;
        return this.playNext(context);
      }

      return msg.channel.send(Embed.error('Expected at least one arg'));
    }

    if (args.sort !== undefined) {
      const sort = args.sort.toLowerCase();
      const normalizedSort = Object.keys(sortAliases).find(k =>
        sortAliases[k].find(keyword => sort === keyword || keyword.includes(sort))
      );

      if (!normalizedSort)
        return msg.channel.send(
          Embed.error('Invalid sort type (valid: newest, oldest, views, random)')
        );

      args.sort = normalizedSort;
    }

    queue.textChannel = msg.channel as TextChannel;

    msg.channel.startTyping();
    let handled = false;
    for (const [name, [regExp, handler]] of Object.entries(handlers)) {
      if (regExp.test(args._[0])) {
        handled = true;
        getLogger(`MESSAGE ${msg.id}`).debug(`handling ${args._[0]} as ${name}`);
        await handler(context, this);
        break;
      }
    }

    if (handled) return;
    if (regExps.url.test(args._[0])) msg.channel.send(Embed.error('Invalid URL'));

    getLogger(`MESSAGE ${msg.id}`).debug(`handling "${args._.join(' ')}" as search`);
    await searchYoutube(context, this);
    msg.channel.stopTyping(true);
  }

  async queueTrack(
    track: Track,
    options: { context: Context; silent?: boolean; beginPlaying?: boolean }
  ): Promise<void> {
    const { msg } = options.context;

    const queue = client.queues.get(msg.guild.id);
    queue.tracks.push(track);
    queue.textChannel = msg.channel as TextChannel;

    if (!queue.playing && (options?.beginPlaying ?? true)) {
      queue.index = queue.tracks.length - 1;
      this.playNext(options.context);
    } else if (!(options?.silent ?? false)) {
      msg.channel.send(
        Embed.success(
          `**${track.titleMarkup}** queued (#${queue.tracks.length - 1} in queue)`,
          queue.paused ? 'music is paused btw' : undefined
        )
      );
    }
  }

  async playNext(context: Context): Promise<void | Message> {
    const { msg } = context;

    const logger = getLogger(`MESSAGE ${msg.id}`);

    const queue = client.queues.get(msg.guild.id);
    const track = queue.tracks[queue.index];

    if (!queue.playing) {
      queue.voiceChannel = msg.member?.voice?.channel as VoiceChannel;
      queue.playing = true;
    }

    queue.voiceChannel && (queue.voiceConnection = await queue.voiceChannel.join());
    await queue.voiceConnection?.voice?.setSelfDeaf(true);

    queue.updateNowPlaying();

    let called = false;

    const callback = async (info: unknown) => {
      try {
        if (called) {
          logger.debug('aborting callback because already called');
          return;
        }
        called = true;

        const queue = client.queues.get(msg.guild.id);

        logger.debug(`track "${track.title}" ended with info "${info}"`);

        queue.embed?.delete();
        delete queue.embed;

        if (!queue.playing) {
          logger.debug(`queue.playing = false, disconnecting`);
          queue.voiceConnection?.disconnect();
          return;
        }

        if (queue.loop === 'one') {
          logger.debug('looping one');
          return this.playNext(context);
        }

        const nextTrack = queue.tracks[queue.index + 1];
        if (!nextTrack) {
          logger.debug('next track does not exist');
          if (queue.loop === 'all') {
            logger.debug('looping all, setting index to 0');
            queue.index = 0;
            this.playNext(context);
          } else {
            // no more in queue and not looping
            logger.debug('not looping all, disconnecting');
            queue.playing = false;
            queue.voiceConnection?.disconnect();
            return;
          }
        } else {
          logger.debug('next track exists, incrementing index and continuing');
          queue.index++;
          return this.playNext(context);
        }
      } catch (err) {
        logger.error('error encountered in callback');
        logger.error(err);
        msg.channel.send(Embed.error(codeBlock(err)));
      }
    };

    const options: StreamOptions = {
      highWaterMark: 20,
      volume: false,
    };

    try {
      logger.debug(`playing track "${track.title}" of type "${track.type}"`);
      queue.voiceConnection
        ?.play(await track.getPlayable(), options)
        .once('close', (info: string) => {
          logger.debug(`close emitted for "${track.title}", calling callback`);
          callback(info);
        })
        .once('finish', (info: string) => {
          logger.debug(`finish emitted for "${track.title}", calling callback`);
          callback(info);
        })
        .on('debug', (info: string) => logger.debug(info))
        .on('error', err => logger.error(err));
    } catch (err) {
      queue.embed?.edit(Embed.error(err.message));
      return callback('error');
    }
  }
}
