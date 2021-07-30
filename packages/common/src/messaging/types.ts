import { AudioPlayerStatus } from '@discordjs/voice';

export type PlayableType = 'youtube' | 'url';

export interface C2MEvents {
  join: [channelId: string];
  play: [type: PlayableType, url: string];
  end: [];
  pause: [];
  resume: [];
  stop: [];
  status: [];
}

type GeneralError = 'GENERAL_ERROR';
type NoConnection = 'NO_CONNECTION';

export type M2CErrorType =
  | `JOIN_${GeneralError | 'ALREADY_JOINED'}`
  | `PLAY_${GeneralError | NoConnection}`
  | `PAUSE_${GeneralError | NoConnection}`
  | `RESUME_${GeneralError | NoConnection}`
  | `STOP_${GeneralError | NoConnection}`
  | `STATUS_${GeneralError}`;

export interface M2CEvents {
  end: [eventId: string];
  stop: [eventId: string];
  pause: [eventId: string];
  resume: [eventId: string];
  error: [eventId: string, code: M2CErrorType, message: string];
  status: [eventId: string, status: AudioPlayerStatus | 'not-connected'];
}
