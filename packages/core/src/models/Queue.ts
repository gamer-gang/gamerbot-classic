import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  getVoiceConnection,
} from '@discordjs/voice';
import { Embed, formatDuration } from '@gamerbot/util';
import { Message, TextChannel, VoiceChannel } from 'discord.js';
import { getLogger } from 'log4js';
import { Track } from './Track';

export type LoopMode = 'none' | 'one' | 'all';

export class Queue {
  tracks: Track[] = [];
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
  audioPlayer: AudioPlayer = createAudioPlayer({ debug: process.env.NODE_ENV === 'development' });
  loop: LoopMode = 'none';
  index = 0;
  embed?: Message;

  reset(): void {
    this.tracks = [];
    this.loop = 'none';
    this.embed?.delete();
    delete this.embed;

    const connection = getVoiceConnection(this.guildId);
    connection?.destroy();
    this.audioPlayer.stop();

    delete this.textChannel;
    delete this.voiceChannel;
    this.index = 0;
  }

  get playing(): boolean {
    return this.audioPlayer.state.status !== AudioPlayerStatus.Idle;
  }

  get paused(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
  }

  constructor(public guildId: string) {}

  get loopSymbol(): string {
    return this.loop === 'all' ? '🔁' : this.loop === 'one' ? '🔂' : '';
  }

  get remainingTime(): number {
    if (!this.playing) return 0;
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

  async updateNowPlaying(): Promise<void | Message> {
    const logger = getLogger(`Queue#updateNowPlaying[guild=${this.guildId}]`);
    logger.debug(`updating now playing embed`);
    if (this.tracks.length === 0 || this.tracks[this.index] == undefined)
      throw new Error('track is null nerd');

    const track = this.tracks[this.index];

    const embed = new Embed({
      title: `Now Playing ${this.loopSymbol} ${this.paused ? '⏸️' : ''}`,
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
