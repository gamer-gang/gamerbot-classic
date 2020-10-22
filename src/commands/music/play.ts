import { Message, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import miniget from 'miniget';
import moment from 'moment';
import * as mm from 'music-metadata';
import yts from 'yt-search';
import ytdl from 'ytdl-core';

import { Command, CommandDocs } from '..';
import { client, getLogger, LoggerType, queueStore, spotify, youtube } from '../../providers';
import { CmdArgs, Track, TrackType } from '../../types';
import {
  Embed,
  getQueueLength,
  getTrackLength,
  getTrackUrl,
  regExps,
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
    if (!voice?.channel)
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'you are not in a voice channel' })
      );

    const queue = queueStore.get(msg.guild?.id as string);

    const permissions = voice.channel.permissionsFor(client.user?.id as string);
    if (!permissions?.has('CONNECT'))
      return msg.channel.send(new Embed({ intent: 'error', title: "can't connect to channel" }));
    if (!permissions?.has('SPEAK'))
      return msg.channel.send(new Embed({ intent: 'error', title: "can't speak in that channel" }));

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
          { cmdArgs }
        );

        return;
      }

      if (queue?.voiceConnection?.dispatcher.paused) {
        queue.voiceConnection?.dispatcher.resume();
        updatePlayingEmbed({ playing: true });
        return msg.channel.send(new Embed({ intent: 'success', title: 'resumed' }));
      }

      return msg.channel.send(new Embed({ intent: 'error', title: 'expected at least one arg' }));
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
          new Embed({
            intent: 'error',
            title: "err: playlist not found (either it doesn't exist or it's private)",
          })
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
            { cmdArgs, silent: true, beginPlaying: false }
          )
      );

      msg.channel.send(
        new Embed({
          intent: 'success',
          title: `queued ${videos.length.toString()} videos from ${playlist.title}`,
        })
      );

      const queue = queueStore.get(msg.guild?.id as string);
      if (queue?.current.embed) queue.current.embed.edit(updatePlayingEmbed());

      this.playNext(cmdArgs);
    } catch (err) {
      getLogger(LoggerType.MESSAGE, msg.id).error(err);
      if (err.toString() === 'Error: resource youtube#playlistListResponse not found')
        return msg.channel.send(
          new Embed({
            intent: 'error',
            title: "err: playlist not found (either it doesn't exist or it's private)",
          })
        );

      return msg.channel.send(
        new Embed({ intent: 'error', title: 'error', description: `\n\`\`\`\n${err}\n\`\`\`` })
      );
    }
  }

  async getYoutubeVideo(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    try {
      const video = await youtube.getVideo(args._[0]);
      if (!video)
        return msg.channel.send(
          new Embed({
            intent: 'error',
            title: "err: video not found (either it doesn't exist or it's private)",
          })
        );
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
        { cmdArgs }
      );
    } catch (err) {
      getLogger(LoggerType.MESSAGE, msg.id).error(err);
      if (err.toString() === 'Error: resource youtube#videoListResponse not found')
        return msg.channel.send(
          new Embed({
            intent: 'error',
            title: "video not found (either it doesn't exist or it's private)",
          })
        );

      return msg.channel.send(
        new Embed({ intent: 'error', title: 'error', description: `\`\`\`\n${err}\n\`\`\`` })
      );
    }
  }

  async getSpotifyAlbum(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    const albumId = regExps.spotify.album.exec(args._[0]);
    if (!albumId) return msg.channel.send(new Embed({ intent: 'error', title: 'invalid album' }));

    const album = await spotify.getAlbum(albumId[1]);
    if (!album) return msg.channel.send(new Embed({ intent: 'error', title: 'invalid album' }));

    for (const { name, artists, duration_ms, id } of album.body.tracks.items) {
      const duration = moment.duration(duration_ms, 'ms');
      this.queueTrack(
        {
          type: TrackType.SPOTIFY,
          data: {
            title: name,
            cover: album.body.images[0],
            artists,
            duration: {
              hours: duration.hours(),
              minutes: duration.minutes(),
              seconds: duration.seconds(),
            },
            id,
          },
          requesterId: msg.author?.id as string,
        },
        { cmdArgs, silent: true, beginPlaying: false }
      );
    }

    const queue = queueStore.get(msg.guild?.id as string);
    if (queue?.current.embed) queue.current.embed.edit(updatePlayingEmbed());

    this.playNext(cmdArgs);
  }

  async getSpotifyPlaylist(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    const playlistId = regExps.spotify.playlist.exec(args._[0]);
    if (!playlistId)
      return msg.channel.send(new Embed({ intent: 'error', title: 'invalid playlist' }));

    const playlist = await spotify.getPlaylist(playlistId[1]);
    if (!playlist)
      return msg.channel.send(new Embed({ intent: 'error', title: 'invalid playlist' }));

    for (const {
      track: { name, artists, duration_ms, id, album },
    } of playlist.body.tracks.items) {
      const duration = moment.duration(duration_ms, 'ms');

      this.queueTrack(
        {
          type: TrackType.SPOTIFY,
          data: {
            title: name,
            cover: album.images[0],
            artists,
            duration: {
              hours: duration.hours(),
              minutes: duration.minutes(),
              seconds: duration.seconds(),
            },
            id,
          },
          requesterId: msg.author?.id as string,
        },
        { cmdArgs, silent: true, beginPlaying: false }
      );
    }

    msg.channel.send(
      new Embed({
        intent: 'success',
        description: `queued ${playlist.body.tracks.items.length} tracks from "${playlist.body.name}"`,
      })
    );

    const queue = queueStore.get(msg.guild?.id as string);
    queue.current.embed && queue.current.embed.edit(updatePlayingEmbed());

    !queue.playing && this.playNext(cmdArgs);
  }

  async getSpotifyTrack(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    const trackId = regExps.spotify.track.exec(args._[0]);
    if (!trackId) return msg.channel.send('invalid track');

    const track = await spotify.getTrack(trackId[1]);
    if (!track) return msg.channel.send('invalid track');

    const duration = moment.duration(track.body.duration_ms, 'ms');

    this.queueTrack(
      {
        type: TrackType.SPOTIFY,
        data: {
          title: track.body.name,
          cover: track.body.album.images[0],
          artists: track.body.artists,
          id: track.body.id,
          duration: {
            hours: duration.hours(),
            minutes: duration.minutes(),
            seconds: duration.seconds(),
          },
        },
        requesterId: msg.author?.id as string,
      },
      { cmdArgs }
    );
  }

  async searchYoutube(cmdArgs: CmdArgs): Promise<void | Message> {
    const {
      msg,
      args,
      config: { prefix },
    } = cmdArgs;

    try {
      const searchMessage = await msg.channel.send(new Embed({ title: 'loading...' }));

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
        new Embed({
          title: 'choose a video',
          description: videos
            .map((t, i) =>
              t
                ? `${i + 1}. [**${he.decode(t.data.title)}**](${getTrackUrl(t)}) (${getTrackLength(
                    t
                  )})`
                : ''
            )
            .join('\n'),
        })
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
          return msg.channel.send(
            new Embed({ intent: 'warning', title: 'invalid selection, try again' })
          );

        index = i;
        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        if (reason === StopReason.PLAYCMD) return;
        if (reason === StopReason.CANCEL)
          return msg.channel.send(new Embed({ title: 'cancelled' }));
        if (!index || Number.isNaN(index) || index < 1 || index > 5)
          return msg.channel.send(
            new Embed({ intent: 'error', title: "invalid selection, time's up" })
          );

        const video = videos[index - 1];
        if (!video)
          throw new Error('invalid state: video is null after selecting valid returned search');

        this.queueTrack(video, { cmdArgs });
      });
    } catch (err) {
      getLogger(LoggerType.MESSAGE, msg.id).error(err);
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'error', description: `\`\`\`\n${err}\n\`\`\`` })
      );
    }
  }

  async queueTrack(
    track: Track,
    options: { cmdArgs: CmdArgs; silent?: boolean; beginPlaying?: boolean }
  ): Promise<void> {
    const { msg, queueStore } = options.cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);
    queue.tracks.push(track);
    queue.textChannel = msg.channel as TextChannel;

    if (!queue.playing && (options?.beginPlaying ?? true)) this.playNext(options.cmdArgs);
    else if (!(options?.silent ?? false)) {
      msg.channel.send(
        new Embed({
          intent: 'success',
          description: `[${track.data.title}](${getTrackUrl(track)}) queued (#${
            queue.tracks.length - 1
          } in queue, approx. ${getQueueLength(queue, {
            first: true,
            last: false,
          })} until playing)`,
        })
      );
      updatePlayingEmbed();
    }
  }

  async playNext(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);

    const track = queue.tracks[0];

    if (!track) {
      // no more in queue
      queue.voiceConnection?.disconnect();
      queue.playing = false;
      queueStore.set(msg.guild?.id as string, queue);
      return;
    }

    if (!queue.playing) {
      const voice = msg.member?.voice as VoiceState;

      queue.voiceChannel = voice.channel as VoiceChannel;
      queue.voiceConnection = await queue.voiceChannel.join();
      await queue.voiceConnection?.voice.setSelfDeaf(true);
      queue.playing = true;
      queueStore.set(msg.guild?.id as string, queue);
    }

    queue.current.embed ??= await msg.channel.send(new Embed({ title: 'loading...' }));

    updatePlayingEmbed({ track, cmdArgs, playing: true });

    const callback = (info: unknown) => {
      getLogger(LoggerType.MESSAGE, msg.id).debug(
        `video "${track.data.title}" ended with info "${info}"`
      );

      const queue = queueStore.get(msg.guild?.id as string);
      queue.tracks.shift();

      updatePlayingEmbed({ playing: false });
      delete queue.current.embed;

      this.playNext(cmdArgs);
    };

    switch (track.type) {
      case TrackType.YOUTUBE:
        queue.voiceConnection?.play(ytdl(track.data.id)).on('finish', callback);
        break;
      case TrackType.FILE:
        queue.voiceConnection?.play(track.data.url).on('finish', callback);
        break;
      case TrackType.SPOTIFY: {
        const error = () => {
          queue.current.embed?.edit(
            new Embed({
              intent: 'error',
              title: `could not play [${track.data.title}](${track.data.id})`,
              description: '',
            })
          );
          return callback('no track found for ' + track.data.id);
        };

        const search = await yts(
          `${track.data.title} ${track.data.artists.map(a => a.name).join(' ')} topic`
        );
        if (!search.videos.length) return error();
        const video = await youtube.getVideo(search.videos[0].url);
        if (!video) return error();

        queue.voiceConnection?.play(ytdl(video.id)).on('finish', callback);
      }
    }
  }
}
