import { Collection, Message, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import * as _ from 'lodash';
import * as ytdl from 'ytdl-core';
import { Command } from '.';
import { CmdArgs, Video } from '../types';

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
    infoAddedToQueue: 'added "%TITLE%" to queue position %INDEX%',
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

    const playlistRegExp = /^https?:\/\/((www\.|music\.|)youtube.com)\/playlist(.*)$/;
    const videoRegExp = /^https?:\/\/((www\.|music\.|)youtube.com)\/watch\?v=(.*)$/;

    if (playlistRegExp.test(args[0])) return this.getPlaylist(cmdArgs);
    else if (videoRegExp.test(args[0])) return this.getVideo(cmdArgs);
    else return this.searchVideo(cmdArgs);
  }

  async getPlaylist(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, youtube, args } = cmdArgs;
    try {
      const playlist = await youtube.getPlaylist(args[0]);
      if (!playlist) return msg.channel.send(this.messages.errPlaylistNotFound);

      const videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        const fullVideo = await youtube.getVideoByID(video.id);
        this.queueVideo(
          {
            url: fullVideo?.url,
            title: fullVideo?.title,
            lengthSeconds: fullVideo?.durationSeconds,
            requesterId: msg.author?.id,
          } as Video,
          cmdArgs,
          { silent: true }
        );
      }
      msg.channel.send(this.messages.infoPlaylistQueued.replace('%NUM', videos.length.toString()));
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
      this.queueVideo(
        {
          url: video.url,
          title: video.title,
          lengthSeconds: video.durationSeconds as number,
          requesterId: msg.author?.id as string,
        },
        cmdArgs
      );
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
          videos.map((v, i) => i + 1 + '. ' + _.unescape(v.title) + '\n').join('')
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
      this.queueVideo(
        {
          url: video.url,
          title: video.title,
          lengthSeconds: video.durationSeconds as number,
          requesterId: msg.author?.id as string,
        },
        cmdArgs
      );
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
    else
      options?.silent ||
        msg.channel.send(
          this.messages.infoAddedToQueue
            .replace('%TITLE%', video.title)
            .replace('%INDEX%', (queue.videos.length - 1).toString())
        );
  }

  async playVideo(cmdArgs: CmdArgs): Promise<void> {
    const { msg, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);

    const video = queue.videos[0];
    if (!video) {
      // no more in queue
      queue.voiceConnection?.disconnect();
      queue.playing = false;
      queueStore.set(msg.guild?.id as string, queue);
      return;
    }

    if (!queue.playing) {
      const voice = msg.member?.voice as VoiceState;
      const voiceChannel = voice.channel as VoiceChannel;

      queue.voiceChannel = voiceChannel;
      await voice.setSelfDeaf(true);
      queue.voiceConnection = await voiceChannel.join();
      queue.playing = true;
      queueStore.set(msg.guild?.id as string, queue);
    }

    queue.textChannel?.send(
      this.messages.infoNowPlaying
        .replace('%TITLE%', video.title)
        .replace('%REQ%', (await msg.guild?.members.fetch(video.requesterId))?.user.tag as string)
    );
    queue.voiceConnection?.play(ytdl(video.url)).on('finish', (info: unknown) => {
      console.info(`video "${video.title}" ended with info ${info}`);
      queue.videos.shift();
      this.playVideo(cmdArgs);
    });
  }
}
