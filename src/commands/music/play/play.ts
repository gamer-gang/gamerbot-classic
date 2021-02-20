import { Message, StreamOptions, TextChannel, VoiceChannel } from 'discord.js';
import _ from 'lodash';
import miniget from 'miniget';
import moment from 'moment';
import * as mm from 'music-metadata';
import { Command, CommandDocs } from '../..';
import { client, getLogger, logger } from '../../../providers';
import { Context, FileTrack, Track } from '../../../types';
import { Embed, regExps } from '../../../util';
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
            duration: moment.duration(metadata.format.duration, 'seconds'),
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
        return msg.channel.send(Embed.error('Invalid sort type (valid: newest, oldest, views)'));

      args.sort = normalizedSort;
    }

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
      queue.updateNowPlaying();
    }
  }

  async playNext(context: Context): Promise<void | Message> {
    const { msg } = context;

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
      if (called) return;
      called = true;

      const queue = client.queues.get(msg.guild.id);

      getLogger(`MESSAGE ${msg.id}`).debug(`track "${track.title}" ended with info "${info}"`);

      queue.embed?.delete();
      delete queue.embed;

      if (!queue.playing) {
        queue.voiceConnection?.disconnect();
        return;
      }

      if (queue.loop === 'one') return this.playNext(context);

      const nextTrack = queue.tracks[queue.index + 1];
      if (!nextTrack) {
        if (queue.loop === 'all') {
          queue.index = 0;
          this.playNext(context);
        } else {
          // no more in queue and not looping
          queue.voiceConnection?.disconnect();
          delete queue.voiceConnection;
          delete queue.voiceChannel;
          queue.playing = false;
          return;
        }
      } else {
        queue.index++;
        return this.playNext(context);
      }
    };

    const options: StreamOptions = {
      highWaterMark: 20,
      volume: false,
    };

    try {
      queue.voiceConnection
        ?.play(await track.getPlayable(), options)
        .on('close', callback)
        .on('finish', callback)
        .on('error', err => logger.error(err));
    } catch (err) {
      queue.embed?.edit(Embed.error(err.message));
      return callback('error');
    }
  }
}
