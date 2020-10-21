import { Message, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import miniget from 'miniget';
import moment from 'moment';
import * as mm from 'music-metadata';
import { Duration } from 'simple-youtube-api';
import yts from 'yt-search';
import ytdl from 'ytdl-core';

import { Command, CommandDocs } from '..';
import { client, getLogger, LoggerType, queueStore, spotify, youtube } from '../../providers';
import { CmdArgs, Track, TrackType } from '../../types';
import {
  Embed,
  formatDuration,
  getQueueLength,
  regExps,
  toDurationSeconds,
  updatePlayingEmbed,
} from '../../util';

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
    const { msg, args, queueStore } = cmdArgs;

    const voice = msg.member?.voice;
    if (!voice?.channel) return msg.channel.send('you are not in voice channel');

    const queue = queueStore.get(msg.guild?.id as string);

    const permissions = voice.channel.permissionsFor(client.user?.id as string);
    if (!permissions?.has('CONNECT')) return msg.channel.send("err: can't connect to channel");
    if (!permissions?.has('SPEAK')) return msg.channel.send("err: can't speak in that channel");

    if (!args._[0]) {
      // check for uploaded files
      if (msg.attachments.size) {
        const attachment = msg.attachments.array()[0];

        const metadata = await mm.parseStream(miniget(attachment.url));

        const duration = moment.duration(metadata.format.duration, 'seconds');
        this.queueTrack(
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

        return;
      }

      if (queue?.voiceConnection?.dispatcher.paused) {
        queue.voiceConnection?.dispatcher.resume();
        updatePlayingEmbed({ playing: true });
        return msg.channel.send('resumed');
      }

      return msg.channel.send('err: expected at least one arg');
    }

    if (regExps.youtube.playlist.test(args._[0])) return this.getYoutubePlaylist(cmdArgs);
    else if (regExps.youtube.video.test(args._[0])) return this.getYoutubeVideo(cmdArgs);
    else if (regExps.spotify.playlist.test(args._[0])) return this.getSpotifyPlaylist(cmdArgs);
    else if (regExps.spotify.album.test(args._[0])) return this.getSpotifyAlbum(cmdArgs);
    else if (regExps.spotify.track.test(args._[0])) return this.getSpotifyTrack(cmdArgs);
    else return this.searchYoutube(cmdArgs);
  }

  async getYoutubePlaylist(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    try {
      const playlist = await youtube.getPlaylist(args._[0]);
      if (!playlist)
        return msg.channel.send(
          "err: playlist not found (either it doesn't exist or it's private)"
        );

      const videos = await playlist.getVideos();
      (await Promise.all(videos.map(v => youtube.getVideoByID(v.id)))).map(
        v =>
          v &&
          this.queueTrack(
            {
              type: TrackType.YOUTUBE,
              data: {
                ...v,
                livestream:
                  (v.raw.snippet as Record<string, string>).liveBroadcastContent === 'live',
              },
              requesterId: msg.author?.id,
            } as Track,
            cmdArgs,
            { silent: true, beginPlaying: false }
          )
      );

      msg.channel.send(`added ${videos.length.toString()} videos to the queue`);

      const queue = queueStore.get(msg.guild?.id as string);
      if (queue?.current.embed) queue.current.embed.edit(updatePlayingEmbed());

      this.playNext(cmdArgs);
    } catch (err) {
      getLogger(LoggerType.MESSAGE, msg.id).error(err);
      if (err.toString() === 'Error: resource youtube#playlistListResponse not found')
        return msg.channel.send(
          "err: playlist not found (either it doesn't exist or it's private)"
        );

      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
    }
  }

  async getYoutubeVideo(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    try {
      const video = await youtube.getVideo(args._[0]);
      if (!video)
        return msg.channel.send("err: video not found (either it doesn't exist or it's private)");
      this.queueTrack(
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
      getLogger(LoggerType.MESSAGE, msg.id).error(err);
      if (err.toString() === 'Error: resource youtube#videoListResponse not found')
        return msg.channel.send("err: video not found (either it doesn't exist or it's private)");

      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
    }
  }

  async getSpotifyAlbum(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    const albumId = regExps.spotify.album.exec(args._[0]);
    if (!albumId) return msg.channel.send('invalid album');

    const album = await spotify.getAlbum(albumId[1]);
    if (!album) return msg.channel.send('invalid album');
    msg.channel.send('searching for videos...');

    const tracks = (
      await this.searchAllAndQueue(
        album.body.tracks.items.map(t => `${t.name} ${t.artists.map(a => a.name).join(' ')} topic`),
        cmdArgs
      )
    ).length;

    const errors = album.body.tracks.items.length - tracks;

    msg.channel.send(
      `queued ${tracks} tracks from "${album.body.name}"${
        errors ? ` (${errors} track${errors === 1 ? '' : 's'} could not be resolved)` : ''
      }`
    );

    const queue = queueStore.get(msg.guild?.id as string);
    if (queue?.current.embed) queue.current.embed.edit(updatePlayingEmbed());

    this.playNext(cmdArgs);
  }

  async getSpotifyPlaylist(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    const playlistId = regExps.spotify.playlist.exec(args._[0]);
    if (!playlistId) return msg.channel.send('invalid playlist');

    const playlist = await spotify.getPlaylist(playlistId[1]);
    if (!playlist) return msg.channel.send('invalid playlist');
    msg.channel.send('searching for videos...');

    const tracks = (
      await this.searchAllAndQueue(
        playlist.body.tracks.items.map(
          t => `${t.track.name} ${t.track.artists.map(a => a.name).join(' ')} topic`
        ),
        cmdArgs
      )
    ).length;

    const errors = playlist.body.tracks.items.length - tracks;

    msg.channel.send(
      `queued ${tracks} tracks from "${playlist.body.name}"${
        errors ? ` (${errors} track${errors === 1 ? '' : 's'} could not be resolved)` : ''
      }`
    );

    const queue = queueStore.get(msg.guild?.id as string);
    if (queue.current.embed) queue.current.embed.edit(updatePlayingEmbed());

    this.playNext(cmdArgs);
  }

  private async searchAllAndQueue(searchQueries: string[], cmdArgs: CmdArgs) {
    const { msg } = cmdArgs;

    const tracks: Track[] = [];

    // basically: search for 1 video for each track (awaited in parallel) and then fetch the video
    // from the data api
    (
      await Promise.all(
        (await Promise.all(searchQueries.map(s => yts(s))))
          .flatMap(s => {
            if (!s.videos.length) {
              msg.channel.send(`could'nt find any youtube results for "${s}"`);
              return [];
            }
            return s.videos[0];
          })
          .map(video => youtube.getVideo(video.url))
      )
    ).map(v => {
      if (!v) return;
      tracks.push({
        type: TrackType.YOUTUBE,
        data: {
          ...v,
          livestream: (v.raw.snippet as Record<string, string>).liveBroadcastContent === 'live',
        },
        requesterId: msg.author?.id as string,
      });
      return this.queueTrack(tracks[tracks.length - 1], cmdArgs, {
        silent: true,
        beginPlaying: false,
      });
    });

    return tracks;
  }

  async getSpotifyTrack(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    const trackId = regExps.spotify.track.exec(args._[0]);
    if (!trackId) return msg.channel.send('invalid track');

    const track = await spotify.getTrack(trackId[1]);
    if (!track) return msg.channel.send('invalid track');

    const searchString = `${track.body.name} ${track.body.artists
      .map(a => a.name)
      .join(' ')} topic`;
    const search = await yts(searchString);

    if (!search.videos)
      return msg.channel.send(`couldnt find any youtube results for "${searchString}"`);

    const video = await youtube.getVideo(search.videos[0].url);

    msg.channel.send(`resolved \`spotify:track:${trackId[1]} => https://youtu.be/${video?.id}\``);
  }

  async searchYoutube(cmdArgs: CmdArgs): Promise<void | Message> {
    const {
      msg,
      args,
      config: { prefix },
    } = cmdArgs;

    try {
      const searchMessage = await msg.channel.send('loading...');

      const search = await yts(args._.join(' '));

      const videos = (
        await Promise.all(search.videos.slice(0, 5).map(v => youtube.getVideo(v.url)))
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

        this.queueTrack(video, cmdArgs);
      });
    } catch (err) {
      getLogger(LoggerType.MESSAGE, msg.id).error(err);
      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
    }
  }

  async queueTrack(
    track: Track,
    cmdArgs: CmdArgs,
    options?: { silent?: boolean; beginPlaying?: boolean }
  ): Promise<void> {
    const { msg, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);
    queue.tracks.push(track);
    queue.textChannel = msg.channel as TextChannel;

    options ??= {};
    options.silent ??= false;
    options.beginPlaying ??= true;

    if (!queue.playing && options?.beginPlaying) this.playNext(cmdArgs);
    else if (!options?.silent) {
      msg.channel.send(
        `added "${track.data.title}" to queue position ${
          queue.tracks.length - 1
        } (approx. ${getQueueLength(queue, { first: true, last: false })} until playing)`
      );
      updatePlayingEmbed();
    }
  }

  async playNext(cmdArgs: CmdArgs): Promise<void> {
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
      getLogger(LoggerType.MESSAGE, msg.id).debug(
        `video "${track.data.title}" ended with info ${info}`
      );

      const queue = queueStore.get(msg.guild?.id as string);
      queue.tracks.shift();

      updatePlayingEmbed({ playing: false });
      delete queue.current.embed;

      clearInterval(queue.current.embedInterval as NodeJS.Timeout);
      delete queue.current.embedInterval;

      queueStore.set(msg.guild?.id as string, queue);

      this.playNext(cmdArgs);
    };

    if (track.type === TrackType.YOUTUBE) {
      connection?.play(ytdl(track.data.id)).on('finish', callback);
    } else {
      connection?.play(track.data.url).on('finish', callback);
    }
  }
}
