import { Message, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import he from 'he';
import https from 'https';
import _ from 'lodash';
import moment from 'moment';
import * as mm from 'music-metadata';
import { Duration } from 'simple-youtube-api';
import temp from 'temp';
import ytdl from 'ytdl-core';

import { Command, CommandDocs } from '..';
import { client, youtube } from '../..';
import { Embed } from '../../embed';
import { CmdArgs, Track, TrackType } from '../../types';
import {
  formatDuration,
  getQueueLength,
  toDurationSeconds,
  youtubePlaylistRegExp,
  youtubeVideoRegExp,
} from '../../util';
import { updatePlayingEmbed } from '../../util/music';

export class CommandPlay implements Command {
  cmd = ['play', 'p'];
  docs: CommandDocs = [
    {
      usage: ['play <url>'],
      description: 'play youtube video from a video/playlist url; must not be private',
    },
    {
      usage: ['play <...searchString>'],
      description: 'search for a video, and choose from the top 5 results.',
    },
  ];
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    if (!args._[0]) {
      // check for local files
      if (msg.attachments.size) {
        const attachment = msg.attachments.array()[0];
        https.get(attachment.url, async res => {
          const metadata = await mm.parseStream(res);

          const duration = moment.duration(metadata.format.duration, 'seconds');
          this.queueVideo(
            {
              requesterId: msg.author?.id as string,
              type: TrackType.FILE,
              data: {
                title: attachment.name || _.last(attachment.url.split('/')),
                url: attachment.url,
                duration: {
                  hours: duration.hours(),
                  minutes: duration.minutes(),
                  seconds: duration.seconds(),
                },
              },
            } as Track,
            cmdArgs
          );
        });

        return;
      }

      return msg.channel.send('err: expected at least one arg');
    }

    const voice = msg.member?.voice;
    if (!voice?.channel) return msg.channel.send('err: not in voice channel');

    const permissions = voice.channel.permissionsFor(client.user?.id as string);
    if (!permissions?.has('CONNECT')) return msg.channel.send("err: can't connect to channel");
    if (!permissions?.has('SPEAK')) return msg.channel.send("err: can't speak in that channel");

    if (youtubePlaylistRegExp.test(args._[0])) return this.getPlaylist(cmdArgs);
    else if (youtubeVideoRegExp.test(args._[0])) return this.getVideo(cmdArgs);
    else return this.searchVideo(cmdArgs);
  }

  async getPlaylist(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, queueStore } = cmdArgs;
    try {
      const playlist = await youtube.getPlaylist(args._[0]);
      if (!playlist)
        return msg.channel.send(
          "err: playlist not found (either it doesn't exist or it's private)"
        );

      const videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        const fullVideo = await youtube.getVideoByID(video.id);
        if (!fullVideo) return;
        this.queueVideo(
          {
            type: TrackType.YOUTUBE,
            data: {
              ...fullVideo,
              livestream:
                (fullVideo.raw.snippet as Record<string, string>).liveBroadcastContent === 'live',
            },
            requesterId: msg.author?.id,
          } as Track,
          cmdArgs,
          { silent: true }
        );
      }
      msg.channel.send(`added ${videos.length.toString()} videos to the queue`);
      const queue = queueStore.get(msg.guild?.id as string);
      if (queue.current.embed) queue.current.embed.edit(updatePlayingEmbed());
    } catch (err) {
      console.error(err);
      if (err.toString() === 'Error: resource youtube#playlistListResponse not found')
        return msg.channel.send(
          "err: playlist not found (either it doesn't exist or it's private)"
        );

      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
    }
  }

  async getVideo(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    try {
      const video = await youtube.getVideo(args._[0]);
      if (!video)
        return msg.channel.send("err: video not found (either it doesn't exist or it's private)");
      this.queueVideo(
        {
          data: {
            ...video,
            livestream:
              (video.raw.snippet as Record<string, string>).liveBroadcastContent === 'live',
          },
          requesterId: msg.author?.id as string,
          type: TrackType.YOUTUBE,
        } as Track,
        cmdArgs
      );
    } catch (err) {
      console.error(err);
      if (err.toString() === 'Error: resource youtube#videoListResponse not found')
        return msg.channel.send("err: video not found (either it doesn't exist or it's private)");

      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
    }
  }

  async searchVideo(cmdArgs: CmdArgs): Promise<void | Message> {
    const {
      msg,
      args,
      config: { prefix },
    } = cmdArgs;

    try {
      const searchMessage = await msg.channel.send('loading...');
      const videos = (
        await Promise.all(
          (await youtube.searchVideos(args._.join(' '))).map(v => youtube.getVideoByID(v.id))
        )
      )
        .flatMap(v => {
          if (!v) return [];
          return {
            ...v,
            livestream: (v.raw.snippet as Record<string, string>).liveBroadcastContent === 'live',
          };
        })
        .map(
          data =>
            ({ type: TrackType.YOUTUBE, requesterId: msg.author?.id as string, data } as Track)
        );

      if (!videos.length) return searchMessage.edit('no results');

      searchMessage.edit(
        'choose a video: \n' +
          videos
            .map((v, i) =>
              v
                ? `${i + 1}. ${he.decode(v.data.title)} (${
                    v.type === TrackType.YOUTUBE && v.data.livestream
                      ? 'livestream'
                      : formatDuration(v.data.duration)
                  })`
                : ''
            )
            .join('\n')
      );

      const collector = msg.channel.createMessageCollector(
        (message: Message) => message.author.id === msg.author?.id,
        { idle: 15000 }
      );

      enum StopReason {
        CANCEL = 'cancel',
        PLAYCMD = 'playcmd',
      }

      let index: number;
      collector.on('collect', (message: Message) => {
        if (message.content.startsWith(`${prefix}cancel`)) return collector.stop(StopReason.CANCEL);

        if (message.content.startsWith(`${prefix}play`)) return collector.stop(StopReason.PLAYCMD);

        const i = parseInt(message.content);
        if (Number.isNaN(i) || i < 1 || i > 5)
          return msg.channel.send('invalid selection, try again');

        index = i;
        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        if (reason === StopReason.PLAYCMD) return;
        if (reason === StopReason.CANCEL) return msg.channel.send('ok');
        if (!index || Number.isNaN(index) || index < 1 || index > 5)
          return msg.channel.send("invalid selection, time's up");

        const video = videos[index - 1];
        if (!video)
          throw new Error('invalid state: video is null after selecting valid returned search');

        this.queueVideo(video, cmdArgs);
      });
    } catch (err) {
      console.error(err);
      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
    }
  }

  queueVideo(video: Track, cmdArgs: CmdArgs, options?: { silent?: boolean }): void {
    const { msg, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);
    queue.tracks.push(video);
    queue.textChannel = msg.channel as TextChannel;
    queueStore.set(msg.guild?.id as string, queue);

    if (!queue.playing) this.playVideo(cmdArgs);
    else if (!options?.silent) {
      msg.channel.send(
        `added "${video.data.title}" to queue position ${
          queue.tracks.length - 1
        } (approx. ${getQueueLength(queue, { first: true, last: false })} until playing)`
      );
      updatePlayingEmbed();
    }
  }

  async playVideo(cmdArgs: CmdArgs): Promise<void> {
    const { msg, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);

    let connection = queue.voiceConnection;

    const track = queue.tracks[0];

    if (!track) {
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

    queue.current.embed ??= await msg.channel.send(new Embed({ title: 'loading...' }));

    const durationSeconds = toDurationSeconds(track.data.duration as Duration);
    const sliderLength = Math.min(Math.ceil(durationSeconds / 6) + 1, 40);

    let thumbPosition = 0;

    updatePlayingEmbed({
      track: track,
      thumbPosition,
      sliderLength,
      cmdArgs,
      playing: true,
    });

    ((track.type === TrackType.YOUTUBE && !track.data.livestream) ||
      track.type === TrackType.FILE) &&
      (queue.current.embedInterval = setInterval(() => {
        thumbPosition++;
        if (thumbPosition > sliderLength - 1) {
          updatePlayingEmbed({ playing: false, thumbPosition: sliderLength });
          queue.current.embed = undefined;

          clearInterval(queue.current.embedInterval as NodeJS.Timeout);
          delete queue.current.embedInterval;
        }
        updatePlayingEmbed({ thumbPosition });
      }, (durationSeconds * 1000) / sliderLength));

    const callback = (info: unknown) => {
      temp.cleanup();

      console.info(`video "${track.data.title}" ended with info ${info}`);

      const queue = queueStore.get(msg.guild?.id as string);
      queue.tracks.shift();

      updatePlayingEmbed({ playing: false });
      delete queue.current.embed;

      clearInterval(queue.current.embedInterval as NodeJS.Timeout);
      delete queue.current.embedInterval;

      queueStore.set(msg.guild?.id as string, queue);

      this.playVideo(cmdArgs);
    };

    if (track.type === TrackType.YOUTUBE) {
      connection?.play(ytdl(track.data.id)).on('finish', callback);
    } else {
      connection?.play(track.data.url).on('finish', callback);
    }
  }
}
