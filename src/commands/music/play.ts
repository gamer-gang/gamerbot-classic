import { Message, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import he from 'he';
import { Duration } from 'simple-youtube-api';
import ytdl from 'ytdl-core';

import { Command, CommandDocs } from '..';
import { client, youtube } from '../..';
import { Embed } from '../../embed';
import { CmdArgs, Video } from '../../types';
import { formatDuration, getQueueLength, toDurationSeconds } from '../../util';

export class CommandPlay implements Command {
  cmd = ['play', 'p'];
  docs : CommandDocs = [
    {
      usage: 'play <url>',
      description: 'play youtube video from a video/playlist url; must not be private'
    },
    {
      usage: 'play <...searchString>',
      description: 'search for a video, and choose from the top 5 results.'
    }
  ];
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    if (!args._[0]) return msg.channel.send('err: expected at least one arg');

    const voice = msg.member?.voice;
    if (!voice?.channel) return msg.channel.send('err: not in voice channel');

    const permissions = voice.channel.permissionsFor(client.user?.id as string);
    if (!permissions?.has('CONNECT')) return msg.channel.send("err: can't connect to channel");
    if (!permissions?.has('SPEAK')) return msg.channel.send("err: can't speak in that channel");

    const playlistRegExp = /^https?:\/\/((www\.|music\.|)youtube.com)\/playlist(.+)$/;
    const videoRegExp = /^https?:\/\/(((www\.|music\.|)youtube\.com)\/watch\?v=(.+)|youtu\.be\/.+)$/;

    if (playlistRegExp.test(args._[0])) return this.getPlaylist(cmdArgs);
    else if (videoRegExp.test(args._[0])) return this.getVideo(cmdArgs);
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
        this.queueVideo(
          {
            ...fullVideo,
            requesterId: msg.author?.id
          } as Video,
          cmdArgs,
          { silent: true }
        );
      }
      msg.channel.send(`added ${videos.length.toString()} videos to the queue`);
      const queue = queueStore.get(msg.guild?.id as string);
      if (queue.playingEmbedMessage) queue.playingEmbedMessage.edit(this.updateVideoEmbed());
    } catch (err) {
      console.error(err);
      if ('' + err === 'Error: resource youtube#playlistListResponse not found')
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
      this.queueVideo({ ...video, requesterId: msg.author?.id as string } as Video, cmdArgs);
    } catch (err) {
      console.error(err);
      if ('' + err === 'Error: resource youtube#videoListResponse not found')
        return msg.channel.send("err: video not found (either it doesn't exist or it's private)");

      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
    }
  }

  async searchVideo(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, config: { prefix } } = cmdArgs;

    try {
      const searchMessage = await msg.channel.send('loading...');
      const videos = (await Promise.all(
        (await youtube.searchVideos(args._.join(' '))).map(v => youtube.getVideoByID(v.id))
      )) as (Video & { livestream: boolean })[];

      videos.forEach(v => {
        v.livestream = (v.raw.snippet as Record<string, string>).liveBroadcastContent === 'live';
      });

      searchMessage.edit(
        'choose a video: \n' +
          videos
            .map((v, i) =>
              v
                ? `${i + 1}. ${he.decode(v.title)} (${
                    v.livestream ? 'livestream' : formatDuration(v.duration)
                  })`
                : ''
            )
            .join('\n')
      );

      const collector = msg.channel.createMessageCollector(
        (message: Message) => message.author.id === msg.author?.id,
        { time: 15000 }
      );

      let index: number;
      collector.on('collect', (message: Message) => {
        if (message.content.startsWith(`${prefix}cancel`))
          return collector.stop('canceled')

        if (message.content.startsWith(`${prefix}play`))
          return collector.stop('playcmd');

        const i = parseInt(message.content);
        if (Number.isNaN(i) || i < 1 || i > 5)
          return msg.channel.send('invalid selection, try again');

        index = i;
        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'playcmd') return;
        if (reason === 'canceled') return msg.channel.send('ok');
        if (!index || Number.isNaN(index) || index < 1 || index > 5)
          return msg.channel.send("invalid selection, time's up");

        const video = videos[index - 1];
        if (!video)
          throw new Error('invalid state: video is null after selecting valid returned search');

        this.queueVideo(
          {
            ...video,
            requesterId: msg.author?.id as string,
            livestream: video.livestream
          } as Video,
          cmdArgs
        );
      });
    } catch (err) {
      console.error(err);
      return msg.channel.send(`error:\n\`\`\`\n${err}\n\`\`\``);
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
        `added "${video.title}" to queue position ${queue.videos.length -
          1} (approx. ${getQueueLength(queue, true)} until playing)`
      );
      this.updateVideoEmbed();
    }
  }

  async playVideo(cmdArgs: CmdArgs): Promise<void> {
    const { msg, queueStore } = cmdArgs;

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
    const sliderLength = Math.min(Math.ceil(durationSeconds / 5) + 1, 40);

    let thumbPosition = 0;
    queue.playingEmbedMessage.edit(
      '',
      this.updateVideoEmbed({ video, thumbPosition: 0, sliderLength, cmdArgs })
    );
    queue.playingEmbedMessageInterval = setInterval(() => {
      thumbPosition++;
      if (thumbPosition > sliderLength - 1) {
        queue.playingEmbedMessage = undefined;
        queue.playingEmbedMessageInterval ?? clearInterval(queue.playingEmbedMessageInterval);
        delete queue.playingEmbedMessageInterval;
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
      delete queue.playingEmbedMessage;
      queue.playingEmbedMessageInterval ?? clearInterval(queue.playingEmbedMessageInterval);
      delete queue.playingEmbedMessageInterval;
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
      video: opts?.video ?? this.embedCache?.video
    };

    const { video, thumbPosition, sliderLength, cmdArgs } = this.embedCache;

    const { queueStore, msg } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);

    const seconds = toDurationSeconds(video.duration);
    const duration = formatDuration(seconds);

    queue.currentVideoSecondsRemaining = seconds - (thumbPosition / sliderLength) * seconds;

    return new Embed()
      .setAuthor('gamerbot80: now playing', 'attachment://hexagon.png')
      .setTitle(`${video.title}`)
      .setDescription(
        `\`${'='.repeat(thumbPosition)}` +
          '⚪' +
          `${'='.repeat(sliderLength - (thumbPosition + 1))}\`` +
          ` (${
            video.livestream
              ? 'livestream'
              : `${formatDuration(queue.currentVideoSecondsRemaining)}/${duration}`
          })`
      )
      .setThumbnail(video.thumbnails.high.url)
      .setURL(`https://youtu.be/${video.id}`)
      .addField('channel', video.channel.title, true)
      .addField('requester', `<@!${video.requesterId}>`, true)
      .addField('queue length', getQueueLength(queue), true);
  }
}

interface EmbedArgs {
  video: Video;
  thumbPosition: number;
  sliderLength: number;
  cmdArgs: CmdArgs;
}
