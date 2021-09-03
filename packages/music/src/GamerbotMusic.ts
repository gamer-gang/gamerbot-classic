import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice';
import { M2CMessageAdapter, PlayableType } from '@gamerbot/common';
import { delay } from '@gamerbot/util';
import { Client, ClientOptions, ClientUser, Snowflake } from 'discord.js';
import { getLogger } from 'log4js';
import ytdl from 'ytdl-core';

export class GamerbotMusic extends Client {
  readonly user!: ClientUser;
  readonly devMode = process.env.NODE_ENV === 'development';

  adapter = new M2CMessageAdapter(
    getLogger(`M2CMessageAdapter+tx`),
    getLogger(`M2CMessageAdapter+rx`)
  );
  audioPlayers = new Map<bigint, AudioPlayer>();

  constructor(
    opts: Omit<ClientOptions, 'partials'> = {
      intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES'],
    }
  ) {
    super(opts);

    this.adapter.on('join', this.join.bind(this));
    this.adapter.on('play', this.play.bind(this));
    this.adapter.on('end', this.end.bind(this));
    this.adapter.on('pause', this.pause.bind(this));
    this.adapter.on('resume', this.resume.bind(this));
    this.adapter.on('stop', this.stop.bind(this));
    this.adapter.on('status', this.status.bind(this));

    delay(5000)(0).then(() => {
      this.adapter.connect();
    });
  }

  async join(eventId: bigint, guildId: bigint, channelId: string): Promise<void> {
    const logger = getLogger(`M2CMessageAdapter!join[guild=${guildId}]`);

    try {
      if (getVoiceConnection(guildId.toString()))
        return void this.adapter.send(
          'error',
          guildId,
          eventId.toString(),
          'JOIN_ALREADY_JOINED',
          'Voice connection already established'
        );

      const connection = joinVoiceChannel({
        guildId: guildId.toString(),
        channelId,
        adapterCreator: this.guilds.resolve(guildId.toString() as Snowflake)!
          .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
        selfDeaf: true,
      });

      const player = createAudioPlayer({ debug: true });
      this.audioPlayers.set(guildId, player);

      connection.subscribe(player);
    } catch (err) {
      logger.error(err);
      this.adapter.send('error', guildId, 'JOIN_GENERAL_ERROR', err, eventId.toString());
    }
  }

  async play(eventId: bigint, guildId: bigint, type: PlayableType, url: string): Promise<void> {
    const logger = getLogger(`M2CMessageAdapter!play[guild=${guildId}]`);
    try {
      const connection = getVoiceConnection(guildId.toString());
      if (!connection)
        return void this.adapter.send(
          'error',
          guildId,
          eventId.toString(),
          'PLAY_NO_CONNECTION',
          'No connection for guild, send join event first'
        );

      const resource = createAudioResource(
        type === 'url' ? url : ytdl(url, { filter: 'audioonly' })
      );

      const player = this.audioPlayers.get(guildId)!;

      const playerLogger = getLogger(`AudioPlayer[guild=${guildId}]`);
      player.play(resource);
      player.on('error', err => {
        this.adapter.send(
          'error',
          guildId,
          eventId.toString(),
          'PLAY_GENERAL_ERROR',
          err.stack ?? err.message
        );
        logger.error(err);
      });
      player.on('debug', msg => playerLogger.trace(msg));
      player.once(AudioPlayerStatus.Idle, () => {
        this.adapter.send('end', guildId, eventId.toString());
      });
    } catch (err) {
      logger.error(err);
      this.adapter.send('error', guildId, 'PLAY_GENERAL_ERROR', err, eventId.toString());
    }
  }

  async end(eventId: bigint, guildId: bigint): Promise<void> {
    const logger = getLogger(`M2CMessageAdapter!stop[guild=${guildId}]`);
    try {
      const connection = getVoiceConnection(guildId.toString());
      if (!connection)
        return void this.adapter.send(
          'error',
          guildId,
          eventId.toString(),
          'PAUSE_NO_CONNECTION',
          'No connection for guild, send join event first'
        );

      const player = this.audioPlayers.get(guildId)!;
      player.once(AudioPlayerStatus.Idle, () => {
        this.adapter.send('end', guildId, eventId.toString());
      });
      player.stop(true);
      this.adapter.send('stop', guildId, eventId.toString());
    } catch (err) {
      logger.error(err);
      this.adapter.send('error', guildId, 'END_GENERAL_ERROR', err, eventId.toString());
    }
  }

  async pause(eventId: bigint, guildId: bigint): Promise<void> {
    const logger = getLogger(`M2CMessageAdapter!stop[guild=${guildId}]`);
    try {
      const connection = getVoiceConnection(guildId.toString());
      if (!connection)
        return void this.adapter.send(
          'error',
          guildId,
          eventId.toString(),
          'PAUSE_NO_CONNECTION',
          'No connection for guild, send join event first'
        );

      this.audioPlayers.get(guildId)!.pause();

      this.adapter.send('pause', guildId, eventId.toString());
    } catch (err) {
      logger.error(err);
      this.adapter.send('error', guildId, 'PAUSE_GENERAL_ERROR', err, eventId.toString());
    }
  }

  async resume(eventId: bigint, guildId: bigint): Promise<void> {
    const logger = getLogger(`M2CMessageAdapter!stop[guild=${guildId}]`);
    try {
      const connection = getVoiceConnection(guildId.toString());
      if (!connection)
        return void this.adapter.send(
          'error',
          guildId,
          eventId.toString(),
          'RESUME_NO_CONNECTION',
          'No connection for guild, send join event first'
        );

      this.audioPlayers.get(guildId)!.unpause();

      this.adapter.send('resume', guildId, eventId.toString());
    } catch (err) {
      logger.error(err);
      this.adapter.send('error', guildId, 'RESUME_GENERAL_ERROR', err, eventId.toString());
    }
  }

  async stop(eventId: bigint, guildId: bigint): Promise<void> {
    const logger = getLogger(`M2CMessageAdapter!stop[guild=${guildId}]`);
    try {
      const connection = getVoiceConnection(guildId.toString());

      this.audioPlayers.get(guildId)?.stop(true);
      connection?.destroy();
      this.audioPlayers.delete(guildId);

      this.adapter.send('stop', guildId, eventId.toString());
    } catch (err) {
      logger.error(err);
      this.adapter.send('error', guildId, 'STOP_GENERAL_ERROR', err, eventId.toString());
    }
  }

  async status(eventId: bigint, guildId: bigint): Promise<void> {
    const logger = getLogger(`M2CMessageAdapter!status[guild=${guildId}]`);
    try {
      const connection = getVoiceConnection(guildId.toString());
      if (!connection)
        return void this.adapter.send('status', guildId, eventId.toString(), 'not-connected');
      else
        return void this.adapter.send(
          'status',
          guildId,
          eventId.toString(),
          this.audioPlayers.get(guildId)!.state.status
        );
    } catch (err) {
      logger.error(err);
      this.adapter.send('error', guildId, 'STATUS_GENERAL_ERROR', err, eventId.toString());
    }
  }
}
