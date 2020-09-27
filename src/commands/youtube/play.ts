import { Collection, Message, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import he from 'he';
import { Duration } from 'simple-youtube-api';
import ytdl from 'ytdl-core';

import { Command } from '..';
import { Embed } from '../../embed';
import { CmdArgs, Video } from '../../types';
import {
  formatDuration,
  getQueueLength,
  setPlayingSecondsRemaining,
  toDurationSeconds,
} from '../../util';

export class CommandPlay implements Command {
  cmd = ['play', 'p'];
  docs = [
    {
      usage: ['play <url>'],
      description: 'play yt video from a video/playlist url; must not be private',
    },
    {
      usage: ['play <...searchString>'],
      description: 'search for a video, and choose from the top 5 results.',
    },
  ];
  private messages = {
    errNotInVoiceChannel: "you aren't in voice channel bro...",
    errNoParams: 'yo i need something to play',
    errPlaylistNotFound:
      "bro i couldn't find that playlist (either it doesnt exist or it's private)",
    errCannotConnect: "i can't connect to that channel bro...",
    errCannotSpeak: "i can't speak in that channel bro...",
    errVideoNotFound: "i couldn't find that video (either it doesn't exist or it's private)",
    infoNowPlaying: 'i be playing "%TITLE%" now (requested by %REQ%)',
    infoSelectVideo: 'ok please choose a video: \n%VIDEOS%',
    errInvalidVideoSelection: "yo that ain't a valid selection",
    errGeneric: 'oops error: ',
    infoPlaylistQueued: 'added %NUM% videos to the queue',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, client, args } = cmdArgs;

    if (!args[0]) return msg.channel.send(this.messages.errNoParams);

    const voice = msg.member?.voice;
    if (!voice?.channel) return msg.channel.send(this.messages.errNotInVoiceChannel);

    const permissions = voice.channel.permissionsFor(client.user?.id as string);
    if (!permissions?.has('CONNECT')) return msg.channel.send(this.messages.errCannotConnect);
    if (!permissions?.has('SPEAK')) return msg.channel.send(this.messages.errCannotSpeak);

    const playlistRegExp = /^https?:\/\/((www\.|music\.|)youtube.com)\/playlist(.+)$/;
    const videoRegExp = /^https?:\/\/(((www\.|music\.|)youtube\.com)\/watch\?v=(.+)|youtu\.be\/.+)$/;

    if (playlistRegExp.test(args[0])) return this.getPlaylist(cmdArgs);
    else if (videoRegExp.test(args[0])) return this.getVideo(cmdArgs);
    else return this.searchVideo(cmdArgs);
  }

  async getPlaylist(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, youtube, args, queueStore } = cmdArgs;
    try {
      const playlist = await youtube.getPlaylist(args[0]);
      if (!playlist) return msg.channel.send(this.messages.errPlaylistNotFound);

      const videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        const fullVideo = await youtube.getVideoByID(video.id);
        this.queueVideo(
          {
            ...fullVideo,
            requesterId: msg.author?.id,
          } as Video,
          cmdArgs,
          { silent: true }
        );
      }
      msg.channel.send(this.messages.infoPlaylistQueued.replace('%NUM%', videos.length.toString()));
      const queue = queueStore.get(msg.guild?.id as string);
      if (queue.playingEmbedMessage) {
        queue.playingEmbedMessage.edit(this.updateVideoEmbed());
      }
    } catch (err) {
      console.error(err);
      if ('' + err === 'Error: resource youtube#playlistListResponse not found')
        return msg.channel.send(this.messages.errPlaylistNotFound);

      await msg.channel.send(this.messages.errGeneric);
      return msg.channel.send('```\n' + err + '\n```');
    }
  }

  async getVideo(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, youtube, args } = cmdArgs;

    try {
      const video = await youtube.getVideo(args[0]);
      if (!video) return msg.channel.send(this.messages.errVideoNotFound);
      this.queueVideo({ ...video, requesterId: msg.author?.id as string } as Video, cmdArgs);
    } catch (err) {
      console.error(err);
      if ('' + err === 'Error: resource youtube#videoListResponse not found')
        return msg.channel.send(this.messages.errVideoNotFound);

      await msg.channel.send(this.messages.errGeneric);
      return msg.channel.send('```\n' + err + '\n```');
    }
  }

  async searchVideo(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, youtube, args } = cmdArgs;

    try {
      const videos = await youtube.searchVideos(args.join(' '));
      msg.channel.send(
        this.messages.infoSelectVideo.replace(
          '%VIDEOS%',
          videos.map((v, i) => i + 1 + '. ' + he.decode(v.title) + '\n').join('')
        )
      );
      let response: Collection<string, Message>;
      try {
        response = await msg.channel.awaitMessages(res => res.content >= 1 && res.content <= 5, {
          max: 1,
          time: 10000,
          errors: ['time'],
        });
      } catch (err) {
        console.error(err);
        return msg.channel.send(this.messages.errInvalidVideoSelection);
      }
      const index = parseInt(response.first()?.content ?? '');
      const video = await youtube.getVideoByID(videos[index - 1].id);
      if (!video) return msg.channel.send(this.messages.errVideoNotFound);
      this.queueVideo({ ...video, requesterId: msg.author?.id as string } as Video, cmdArgs);
    } catch (err) {
      console.error(err);
      await msg.channel.send(this.messages.errGeneric);
      return msg.channel.send('```\n' + err + '\n```');
    }
  }

  queueVideo(video: Video, cmdArgs: CmdArgs, options?: { silent?: boolean }): void {
    const { msg, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);
    queue.videos.push(video);
    queue.textChannel = msg.channel as TextChannel;
    queueStore.set(msg.guild?.id as string, queue);

    if (!queue.playing) this.playVideo(cmdArgs);
    else if (!options?.silent) {
      msg.channel.send(
        `added "${video.title}" to queue position ${
          queue.videos.length - 1
        } (approx. ${getQueueLength(queue, true)} until playing)`
      );
      this.updateVideoEmbed();
    }
  }

  async playVideo(cmdArgs: CmdArgs): Promise<void> {
    const { msg, queueStore, client } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);

    let connection = queue.voiceConnection;

    const video = queue.videos[0];

    if (!video) {
      // no more in queue
      connection?.disconnect();
      queue.playing = false;
      queueStore.set(msg.guild?.id as string, queue);
      return;
    }

    if (!queue.playing) {
      const voice = msg.member?.voice as VoiceState;
      await voice.setSelfDeaf(true);

      queue.voiceChannel = voice.channel as VoiceChannel;
      connection = await queue.voiceChannel.join();
      queue.voiceConnection = connection;
      queue.playing = true;
      queueStore.set(msg.guild?.id as string, queue);
    }

    queue.playingEmbedMessage ??= await msg.channel.send('loading...');

    const durationSeconds = toDurationSeconds(video.duration as Duration);
    const sliderLength = Math.ceil(durationSeconds / 5) + 1;

    let thumbPosition = 0;
    queue.playingEmbedMessage.edit(
      '',
      this.updateVideoEmbed({ video, thumbPosition: 0, sliderLength, cmdArgs })
    );
    const interval = setInterval(() => {
      thumbPosition++;
      if (thumbPosition > sliderLength - 1) {
        queue.playingEmbedMessage = undefined;
        return clearInterval(interval);
      }
      queue.playingEmbedMessage?.edit(
        '',
        this.updateVideoEmbed({ video, thumbPosition, sliderLength, cmdArgs })
      );
    }, (durationSeconds * 1000) / sliderLength);

    connection?.play(ytdl(video.id)).on('finish', (info: unknown) => {
      console.info(`video "${video.title}" ended with info ${info}`);

      const queue = queueStore.get(msg.guild?.id as string);
      queue.videos.shift();
      queueStore.set(msg.guild?.id as string, queue);

      this.playVideo(cmdArgs);
    });
  }

  private embedCache?: EmbedArgs;

  updateVideoEmbed(opts?: Partial<EmbedArgs>): Embed {
    this.embedCache ??= opts as EmbedArgs;
    this.embedCache = {
      cmdArgs: opts?.cmdArgs ?? this.embedCache?.cmdArgs,
      sliderLength: opts?.sliderLength ?? this.embedCache?.sliderLength,
      thumbPosition: opts?.thumbPosition ?? this.embedCache?.thumbPosition,
      video: opts?.video ?? this.embedCache?.video,
    };

    const { video, thumbPosition, sliderLength, cmdArgs } = this.embedCache;

    const { queueStore, msg } = cmdArgs;

    const duration = formatDuration(video.duration as Duration);

    setPlayingSecondsRemaining(
      (thumbPosition / sliderLength) * toDurationSeconds(video.duration as Duration)
    );

    const queue = queueStore.get(msg.guild?.id as string);

    return new Embed()
      .setAuthor('gamerbot80: now playing', 'attachment://hexagon.png')
      .setTitle(`${video.title}`)
      .setDescription(
        `\`${'='.repeat(thumbPosition)}` +
          '⚪' +
          `${'='.repeat(sliderLength - (thumbPosition + 1))}\`` +
          ` (${duration})`
      )
      .setThumbnail(video.thumbnails.high.url)
      .setURL(`https://youtu.be/${video.id}`)
      .addField('channel', video.channel.title, true)
      .addField('requester', `<@!${video.requesterId}>`, true)
      .addField('queue length', getQueueLength(queue), true);
  }
}

type EmbedArgs = {
  video: Video;
  thumbPosition: number;
  sliderLength: number;
  cmdArgs: CmdArgs;
};
