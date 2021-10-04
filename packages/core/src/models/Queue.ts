import { codeBlock } from '@discordjs/builders';
import { AudioPlayerStatus } from '@discordjs/voice';
import { C2MMessageAdapter, M2CEvents } from '@gamerbot/common';
import { delay, Embed, formatDuration } from '@gamerbot/util';
import { Message, Snowflake, StageChannel, TextChannel, VoiceChannel } from 'discord.js';
import { getLogger } from 'log4js';
import { Track } from './Track';

export type LoopMode = 'none' | 'one' | 'all';

export class Queue {
  adapter: C2MMessageAdapter;
  tracks: Track[] = [];
  voiceChannel?: VoiceChannel | StageChannel;
  textChannel?: TextChannel;
  loop: LoopMode = 'none';
  index = 0;
  embed?: Message;

  constructor(public guildId: string) {
    this.adapter = new C2MMessageAdapter(
      guildId,
      getLogger(`C2MMessageAdapter+tx`),
      getLogger(`C2MMessageAdapter+rx`)
    );

    const logger = getLogger(`C2MMessageAdapter!error[guild=${guildId}]`);
    this.adapter.on('error', (id, guildId, eventId, code, message) => {
      if (guildId.toString() !== this.guildId) return;
      logger.error(`event ${eventId} errored (${code}): ${message}`);
    });

    this.adapter.connect();
  }

  reset(): void {
    this.tracks = [];
    this.loop = 'none';
    this.embed?.delete();
    delete this.embed;

    this.adapter.send('stop');

    // const connection = getVoiceConnection(this.guildId);
    // connection?.destroy();
    // this.audioPlayer.stop();

    delete this.textChannel;
    delete this.voiceChannel;
    this.index = 0;
  }

  #getStatus(): Promise<AudioPlayerStatus | 'not-connected'> {
    const logger = getLogger('Queue##getStatus');

    return new Promise(resolve => {
      let requestId: bigint;

      const statusListener = (
        id: bigint,
        guildId: bigint,
        ...[eventId, status]: M2CEvents['status']
      ) => {
        if (requestId.toString().replace(/n$/g, '') !== eventId.toString().replace(/n$/g, ''))
          return logger.debug(
            `${requestId}: ignoring status event that references event ${eventId}`
          );
        this.adapter.off('status', statusListener);

        logger.debug(`resolving with ${status}`);
        resolve(status);
      };

      this.adapter.on('status', statusListener);

      logger.trace(this.adapter.listeners('status'));

      setTimeout(() => {
        logger.debug('requesting status');
        requestId = this.adapter.send('status');
      }, 150);
    });
  }

  get playing(): Promise<boolean> {
    return this.#getStatus().then(
      status => status !== AudioPlayerStatus.Idle && status !== 'not-connected'
    );
  }

  get paused(): Promise<boolean> {
    return this.#getStatus().then(status => status === AudioPlayerStatus.Paused);
  }

  get loopSymbol(): string {
    return this.loop === 'all' ? '🔁' : this.loop === 'one' ? '🔂' : '';
  }

  async remainingTime(): Promise<number> {
    if (!(await this.playing)) return 0;
    return (
      // this.tracks[this.index].duration.as('seconds') -
      // Math.floor(
      //   this.voiceConnection. - this.voiceConnection.dispatcher.pausedTime
      // ) /
      //   1000
      0
      // TODO:
    );
  }

  get length(): string {
    if (this.tracks.find(v => v.isYoutube() && v.livestream)) return '?';

    const totalDurationSeconds = this.tracks
      .map(t => t.duration.as('seconds'))
      .reduce((a, b) => a + Math.round(b), 0);

    return formatDuration(isNaN(totalDurationSeconds) ? 0 : totalDurationSeconds);
  }

  async queueTracks(tracks: Track[], requesterId: Snowflake, next = false): Promise<number> {
    const logger = getLogger(`Queue#queueTracks[guild=${this.guildId}]`);
    tracks.forEach(t => (t.requesterId = requesterId));

    if (next) this.tracks.splice(this.index + 1, 0, ...tracks);
    else this.tracks.push(...tracks);

    const end = next ? this.index + 1 + tracks.length : this.tracks.length;
    const start = end - tracks.length;

    if (!(await this.playing)) {
      logger.debug('not playing, calling playNext');
      this.index = start;
      this.playNext();
    }

    return start;
  }

  // TODO: run voice connections and audio players in a separate process for better performance
  // as of now, the audio player may freeze/lag for a bit when running other intensive bot commands

  async playNext(): Promise<void> {
    const logger = getLogger(`Queue#playNext[guild=${this.guildId}]`);

    logger.debug('begin playNext');

    const track = this.tracks[this.index];

    if (!track) {
      logger.debug('no track at current index, resetting queue');
      this.reset();
      return;
    }

    if (!this.voiceChannel) throw new Error('No voice channel set');

    if ((await this.#getStatus()) === 'not-connected') {
      logger.debug('connection to voice channel');
      this.adapter.send('join', this.voiceChannel.id);
      await delay(500)(0);
    } else {
      logger.debug('already connected, continuing');
    }

    // if (!getVoiceConnection(this.guildId)) {
    //   const connection = joinVoiceChannel({
    //     guildId: this.guildId,
    //     channelId: this.voiceChannel.id,
    //     adapterCreator: client.guilds.resolve(this.guildId! as Snowflake)!
    //       .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
    //     selfDeaf: true,
    //   });
    //   connection.subscribe(this.audioPlayer);
    // }

    logger.debug(`playing track "${track.title}"`);

    // const connection = getVoiceConnection(this.guildId);

    this.updateNowPlaying();

    const callback = async () => {
      logger.debug('callback called');
      try {
        this.embed?.delete();
        delete this.embed;

        if (this.voiceChannel && this.voiceChannel.members.size <= 1) {
          // only the bot in the channel
          logger.debug('only the bot in the voice channel, resetting queue');
          this.reset();
          return;
        }

        if (this.loop === 'one') {
          logger.debug('looping one');
          return this.playNext();
        }

        const nextTrack = this.tracks[this.index + 1];
        if (!nextTrack) {
          logger.debug('next track does not exist');
          if (this.loop === 'all') {
            logger.debug('looping all, setting index to 0');
            this.index = 0;
            this.playNext();
          } else {
            // no more in queue and not looping
            logger.debug('not looping all, disconnecting');
            this.index++;
            // connection?.destroy();
            this.adapter.send('stop');
            return;
          }
        } else {
          logger.debug('next track exists, incrementing index and continuing');
          this.index++;
          return this.playNext();
        }
      } catch (err) {
        logger.error('error encountered in callback');
        logger.error(err);
        this.textChannel && Embed.error(codeBlock(err)).send(this.textChannel);
      }
    };

    // const options: StreamOptions = {
    //   highWaterMark: 1 << 32,
    //   volume: false,
    // };

    try {
      const endListener = (id: bigint, guildId: bigint, ...[eventId]: M2CEvents['end']) => {
        if (guildId.toString() !== this.guildId) return;
        this.adapter.off('end', endListener);
        callback();
      };

      this.adapter.on('end', endListener);

      logger.trace(this.adapter.listeners('end'));

      logger.debug('attached end listener, sending play message');

      setTimeout(async () => {
        this.adapter.send('play', ...(await track.getPlayable()));
      }, 150);

      // setInterval(() => console.log(this.adapter.listeners('end')), 5000);

      // const resource = createAudioResource(await track.getPlayable());

      // this.audioPlayer.play(resource);

      // this.audioPlayer.on('error', err => logger.error(err)).once(AudioPlayerStatus.Idle, callback);
    } catch (err) {
      logger.error('playing track errored');
      logger.error(err);
      this.textChannel && Embed.error(err.message).send(this.textChannel);
      return callback();
    }
  }

  async updateNowPlaying(): Promise<void | Message> {
    const logger = getLogger(`Queue#updateNowPlaying[guild=${this.guildId}]`);
    logger.debug(`updating now playing embed`);
    if (this.tracks.length === 0 || this.tracks[this.index] == undefined)
      throw new Error('track is null nerd');

    const track = this.tracks[this.index];

    const embed = new Embed({
      title: `Now Playing ${this.loopSymbol} ${(await this.paused) ? '⏸️' : ''}`,
      description: `**${track.titleMarkup}** (${track.type})`,
    });

    if (track.isYoutube()) {
      track.coverUrl && embed.setThumbnail(track.coverUrl);
      embed.addField('Channel', track.authorMarkup, true);
    } else if (track.isSpotify()) {
      embed.setThumbnail(track.coverUrl).addField('Artist', track.authorMarkup, true);
    }

    embed.addField('Duration', track.durationString, true);
    embed.addField('Requested by', `<@${track.requesterId}>`, true);

    if (this.embed && !this.embed.deleted) {
      logger.debug(`existing non-deleted embed, editing it`);
      return this.embed.edit({ embeds: [embed] });
    } else if (this.textChannel) {
      logger.debug(`sending new now playing embed`);
      this.embed = await embed.send(this.textChannel);
      return this.embed;
    }

    throw new Error('no text channel set; embed has nowhere to go');
  }
}
