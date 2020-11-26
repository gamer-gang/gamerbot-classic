import { Message, TextChannel, VoiceChannel } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import miniget from 'miniget';
import * as mm from 'music-metadata';
import yts from 'yt-search';
import ytdl from 'ytdl-core';

import { Command, CommandDocs } from '..';
import { client, getLogger } from '../../providers';
import { Context, Track, TrackType } from '../../types';
import {
  codeBlock,
  Embed,
  getQueueLength,
  getTrackLength,
  getTrackUrl,
  isLivestream,
  regExps,
  toDuration,
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
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const voice = msg.member?.voice;
    if (!voice?.channel) return msg.channel.send(Embed.error('you are not in a voice channel'));

    const queue = client.queues.get(msg.guild.id);

    const permissions = voice.channel.permissionsFor(client.user?.id as string);
    if (!permissions?.has('CONNECT'))
      return msg.channel.send(Embed.error("can't connect to channel"));
    if (!permissions?.has('SPEAK'))
      return msg.channel.send(Embed.error("can't speak in that channel"));

    if (!args._[0]) {
      // check for uploaded files
      if (msg.attachments.size) {
        const attachment = msg.attachments.array()[0];
        const metadata = await mm.parseStream(miniget(attachment.url));

        this.queueTrack(
          {
            requesterId: msg.author?.id as string,
            type: TrackType.FILE,
            data: {
              title: attachment.name || _.last(attachment.url.split('/')),
              url: attachment.url,
              duration: toDuration(metadata.format.duration),
            },
          } as Track,
          { context }
        );

        return;
      }

      if (queue?.voiceConnection?.dispatcher.paused) {
        queue.voiceConnection?.dispatcher.resume();
        queue.paused = false;
        updatePlayingEmbed({ guildId: msg.guild.id, playing: true });
        return msg.channel.send(new Embed({ intent: 'success', title: 'resumed' }));
      }

      return msg.channel.send(Embed.error('expected at least one arg'));
    }

    if (regExps.youtube.playlist.test(args._[0])) return this.getYoutubePlaylist(context);
    else if (regExps.youtube.video.test(args._[0])) return this.getYoutubeVideo(context);
    else if (regExps.spotify.playlist.test(args._[0])) return this.getSpotifyPlaylist(context);
    else if (regExps.spotify.album.test(args._[0])) return this.getSpotifyAlbum(context);
    else if (regExps.spotify.track.test(args._[0])) return this.getSpotifyTrack(context);
    else if (regExps.url.test(args._[0])) return msg.channel.send(Embed.error('invalid url'));
    else return this.searchYoutube(context);
  }

  async getYoutubePlaylist(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    try {
      const playlist = await client.youtube.getPlaylist(args._[0]);
      if (!playlist)
        return msg.channel.send(
          Embed.error("playlist not found (either it doesn't exist or it's private)")
        );

      const videos = await playlist.getVideos();
      (await Promise.all(videos.map(v => client.youtube.getVideoByID(v.id)))).map(
        v =>
          v &&
          this.queueTrack(
            {
              type: TrackType.YOUTUBE,
              data: { ...v, livestream: isLivestream(v) },
              requesterId: msg.author?.id,
            } as Track,
            { context, silent: true, beginPlaying: false }
          )
      );

      msg.channel.send(
        new Embed({
          intent: 'success',
          description:
            `queued ${videos.length.toString()} videos from ` +
            `**[${playlist.title}](https://client.youtube.com/playlist?list=${playlist.id})**`,
        })
      );

      const queue = client.queues.get(msg.guild.id);
      if (queue?.current.embed) updatePlayingEmbed({ guildId: msg.guild.id });

      this.playNext(context);
    } catch (err) {
      getLogger(`MESSAGE ${msg.id}`).error(err);
      if (err.toString() === 'Error: resource youtube#playlistListResponse not found')
        return msg.channel.send(
          Embed.error("playlist not found (either it doesn't exist or it's private)")
        );

      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }

  async getYoutubeVideo(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    try {
      const video = await client.youtube.getVideo(args._[0]);
      if (!video)
        return msg.channel.send(
          Embed.error("video not found (either it doesn't exist or it's private)")
        );
      this.queueTrack(
        {
          data: { ...video, livestream: isLivestream(video) },
          requesterId: msg.author?.id as string,
          type: TrackType.YOUTUBE,
        },
        { context }
      );
    } catch (err) {
      getLogger(`MESSAGE ${msg.id}`).error(err);
      if (err.toString() === 'Error: resource youtube#videoListResponse not found')
        return msg.channel.send(
          Embed.error("video not found (either it doesn't exist or it's private)")
        );

      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }

  async getSpotifyAlbum(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const albumId = regExps.spotify.album.exec(args._[0]);
    if (!albumId) return msg.channel.send(Embed.error('invalid album'));

    const album = await client.spotify.getAlbum(albumId[1]);
    if (!album) return msg.channel.send(Embed.error('invalid album'));

    for (const { name, artists, duration_ms, id } of album.body.tracks.items) {
      this.queueTrack(
        {
          type: TrackType.SPOTIFY,
          data: {
            title: name,
            cover: album.body.images[0],
            artists,
            duration: toDuration(duration_ms, 'ms'),
            id,
          },
          requesterId: msg.author?.id as string,
        },
        { context, silent: true, beginPlaying: false }
      );
    }

    const queue = client.queues.get(msg.guild.id);
    if (queue?.current.embed) updatePlayingEmbed({ guildId: msg.guild.id });

    msg.channel.send(
      Embed.success(
        `queued ${album.body.tracks.items.length} tracks from ` +
          `**[${album.body.name}](https://open.client.spotify.com/album/${album.body.id})**`,
        queue.paused ? 'music is paused btw' : undefined
      )
    );

    this.playNext(context);
  }

  async getSpotifyPlaylist(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const playlistId = regExps.spotify.playlist.exec(args._[0]);
    if (!playlistId) return msg.channel.send(Embed.error('invalid playlist'));

    const playlist = await client.spotify.getPlaylist(playlistId[1]);
    if (!playlist) return msg.channel.send(Embed.error('invalid playlist'));

    for (const {
      track: { name, artists, duration_ms, id, album },
    } of playlist.body.tracks.items) {
      this.queueTrack(
        {
          type: TrackType.SPOTIFY,
          data: {
            title: name,
            cover: album.images[0],
            artists,
            duration: toDuration(duration_ms, 'ms'),
            id,
          },
          requesterId: msg.author?.id as string,
        },
        { context, silent: true, beginPlaying: false }
      );
    }

    const queue = client.queues.get(msg.guild.id);
    queue.current.embed && updatePlayingEmbed({ guildId: msg.guild.id });

    msg.channel.send(
      Embed.success(
        `queued ${playlist.body.tracks.items.length} tracks from ` +
          `**[${playlist.body.name}](https://open.client.spotify.com/playlist/${playlist.body.id})**`,
        queue.paused ? 'music is paused btw' : undefined
      )
    );

    !queue.playing && this.playNext(context);
  }

  async getSpotifyTrack(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const trackId = regExps.spotify.track.exec(args._[0]);
    if (!trackId) return msg.channel.send('invalid track');

    const track = await client.spotify.getTrack(trackId[1]);
    if (!track) return msg.channel.send('invalid track');

    this.queueTrack(
      {
        type: TrackType.SPOTIFY,
        data: {
          title: track.body.name,
          cover: track.body.album.images[0],
          artists: track.body.artists,
          id: track.body.id,
          duration: toDuration(track.body.duration_ms, 'ms'),
        },
        requesterId: msg.author?.id as string,
      },
      { context }
    );
  }

  async searchYoutube(context: Context): Promise<void | Message> {
    const { msg, args, config } = context;

    try {
      const searchMessage = await msg.channel.send(Embed.info('loading...'));

      const search = await yts({ query: args._.join(' '), category: 'music' });

      const videos = (
        await Promise.all(search.videos.slice(0, 5).map(v => client.youtube.getVideo(v.url)))
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

      if (!videos.length) return searchMessage.edit(Embed.error('no results found'));

      searchMessage.edit(
        new Embed({
          title: 'choose a video',
          description: videos
            .filter(t => !!t)
            .map(
              (track, index) =>
                `${index + 1}. ` +
                `**[${he.decode(track.data.title)}](${getTrackUrl(track)})**` +
                ` (${getTrackLength(track)})`
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
      collector.on('collect', (collected: Message) => {
        if (collected.content.startsWith(`${config.prefix}cancel`))
          return collector.stop(StopReason.CANCEL);
        if (new RegExp(`^\\${config.prefix}p(lay)?`).test(collected.content))
          return collector.stop(StopReason.PLAYCMD);

        const i = parseInt(collected.content);
        if (isNaN(i) || i < 1 || i > videos.length)
          return msg.channel.send(Embed.warning('invalid selection, try again'));

        index = i;
        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        if (reason === StopReason.PLAYCMD) return;
        if (reason === StopReason.CANCEL) return msg.channel.send(Embed.info('cancelled'));
        if (!index || Number.isNaN(index) || index < 1 || index > videos.length)
          return msg.channel.send(Embed.error("invalid selection, time's up"));

        const video = videos[index - 1];
        if (!video)
          throw new Error('invalid state: video is null after selecting valid returned search');

        this.queueTrack(video, { context });
      });
    } catch (err) {
      getLogger(`MESSAGE ${msg.id}`).error(err);
      return msg.channel.send(codeBlock(err));
    }
  }

  async queueTrack(
    track: Track,
    options: { context: Context; silent?: boolean; beginPlaying?: boolean }
  ): Promise<void> {
    const { msg } = options.context;

    const queue = client.queues.get(msg.guild.id);
    queue.tracks.push(track);
    queue.textChannel = msg.channel as TextChannel;

    if (!queue.playing && (options?.beginPlaying ?? true)) this.playNext(options.context);
    else if (!(options?.silent ?? false)) {
      msg.channel.send(
        Embed.success(
          `**[${track.data.title}](${getTrackUrl(track)})** queued (#${
            queue.tracks.length - 1
          } in queue, approx. ${getQueueLength(queue, {
            first: true,
            last: false,
          })} until playing)`,
          queue.paused ? 'music is paused btw' : undefined
        )
      );
      updatePlayingEmbed({ guildId: msg.guild.id });
    }
  }

  async playNext(context: Context): Promise<void | Message> {
    const { msg } = context;

    let queue = client.queues.get(msg.guild.id);

    const track = queue.tracks[0];

    if (!track) {
      // no more in queue
      queue.voiceConnection?.disconnect();
      queue = { tracks: [], current: {}, playing: false, paused: false };
      client.queues.set(msg.guild.id, queue);
      return;
    }

    if (!queue.playing) {
      queue.voiceChannel = msg.member?.voice?.channel as VoiceChannel;
      queue.playing = true;
    }

    queue.voiceChannel && (queue.voiceConnection ??= await queue.voiceChannel.join());
    await queue.voiceConnection?.voice?.setSelfDeaf(true);

    queue.current.embed = await msg.channel.send(Embed.info('loading...'));
    updatePlayingEmbed({ track, guildId: msg.guild.id, playing: true });

    const callback = (info: unknown) => {
      const queue = client.queues.get(msg.guild.id);

      getLogger(`MESSAGE ${msg.id}`).debug(`track "${track.data.title}" ended with info "${info}"`);

      queue.tracks.shift();

      updatePlayingEmbed({ guildId: msg.guild.id, playing: false });
      delete queue.current.embed;

      this.playNext(context);
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
            Embed.error(
              `could not play **[${track.data.title}](${getTrackUrl(track)})**\n` +
                `couldn't find an equivalent video on youtube`
            )
          );
          return callback('no track found for ' + track.data.id);
        };

        const search = await yts({
          query: `${track.data.title} ${track.data.artists.map(a => a.name).join(' ')} topic`,
          category: 'music',
        });
        if (!search.videos.length) return error();
        const video = await client.youtube.getVideo(search.videos[0].url);
        if (!video) return error();

        queue.voiceConnection?.play(ytdl(video.id)).on('finish', callback);
      }
    }
  }
}
