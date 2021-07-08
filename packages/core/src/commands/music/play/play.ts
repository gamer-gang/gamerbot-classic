import {
  AudioPlayerStatus,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice';
import { Context } from '@gamerbot/types';
import { codeBlock, Embed, normalizeDuration, regExps } from '@gamerbot/util';
import { Message, TextChannel, VoiceChannel } from 'discord.js';
import _ from 'lodash';
import { Duration } from 'luxon';
import miniget from 'miniget';
import * as mm from 'music-metadata';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '../..';
import { FileTrack, Track } from '../../../models';
import { client, getLogger } from '../../../providers';
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
  yargs: yargsParser.Options = {
    boolean: ['1', '2', '3', '4', '5'],
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const voice = msg.member?.voice;
    if (!voice?.channel) return Embed.error('You are not in a voice channel').reply(msg);
    if (msg.guild.me?.voice.channelId && msg.guild.me.voice.channelId !== voice.channelId)
      return Embed.error('You are not in the channel').reply(msg);

    const queue = client.queues.get(msg.guild.id);

    const permissions = voice.channel.permissionsFor(client.user.id);
    if (!permissions?.has('CONNECT')) return Embed.error("Can't connect to channel").reply(msg);
    if (!permissions?.has('SPEAK')) return Embed.error("Can't speak in channel").reply(msg);

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

      if (queue.paused) {
        queue.audioPlayer.unpause();
        queue.updateNowPlaying();
        msg.react('▶️');
        return;
      }

      if (!queue.playing && queue.tracks.length) {
        queue.index = 0;
        return this.playNext(context);
      }

      return Embed.error('Expected at least one arg').reply(msg);
    }

    if (args.sort !== undefined) {
      const sort = args.sort.toLowerCase();
      const normalizedSort = Object.keys(sortAliases).find(k =>
        sortAliases[k].find(keyword => sort === keyword || keyword.includes(sort))
      );

      if (!normalizedSort) return;
      Embed.error('Invalid sort type (valid: newest, oldest, views, random)').reply(msg);

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
    if (regExps.url.test(args._[0])) Embed.error('Invalid URL').reply(msg);

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
      Embed.success(
        `**${track.titleMarkup}** queued (#${queue.tracks.length - 1} in queue)`,
        queue.paused ? 'music is paused btw' : undefined
      ).reply(msg);
    }
  }

  // TODO: run voice connections and audio players in a separate process for better performance
  // as of now, the audio player may freeze/lag for a bit when running other intensive bot commands

  async playNext(context: Context): Promise<void> {
    const { msg } = context;

    const logger = getLogger(`GUILD ${msg.guild.id}`);

    const queue = client.queues.get(msg.guild.id);
    const track = queue.tracks[queue.index];

    if (!track) {
      logger.debug('playNext called but no track at current index, exiting');
      return;
    }

    if (!queue.playing) {
      logger.debug(`playNext called but queue.playing = false, connecting to channel`);
      queue.voiceChannel = msg.member?.voice?.channel as VoiceChannel;

      const connection = joinVoiceChannel({
        guildId: msg.guild.id,
        channelId: queue.voiceChannel.id,
        adapterCreator: msg.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
        selfDeaf: true,
      });
      connection.subscribe(queue.audioPlayer);
    }

    const connection = getVoiceConnection(msg.guild.id);

    logger.debug(`playNext called, playing track "${track.title}"`);

    queue.updateNowPlaying();

    let called = false;

    const callback = async () => {
      try {
        if (called) {
          logger.debug('aborting callback because already called');
          return;
        }
        called = true;

        const queue = client.queues.get(msg.guild.id);

        logger.debug(`callback called in ${msg.guild.name}`);

        queue.embed?.delete();
        delete queue.embed;

        // if (!queue.playing) {
        //   logger.debug(`queue.playing = false, disconnecting`);
        //   connection?.destroy();
        //   return;
        // }

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
            queue.index++;
            connection?.destroy();
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
        Embed.error(codeBlock(err)).send(queue.textChannel ?? msg.channel);
      }
    };

    // const options: StreamOptions = {
    //   highWaterMark: 1 << 32,
    //   volume: false,
    // };

    try {
      logger.debug('playing track to dispatcher');

      const resource = createAudioResource(await track.getPlayable());

      queue.audioPlayer.play(resource);

      queue.audioPlayer
        .on('error', err => logger.error(err))
        .once(AudioPlayerStatus.Idle, callback);
    } catch (err) {
      logger.error(err);
      Embed.error(err.message).send(queue.textChannel ?? msg.channel);
      return callback();
    }
  }
}
