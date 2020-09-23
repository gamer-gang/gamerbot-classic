import moment from 'moment';
import { Duration } from 'simple-youtube-api';

import { GuildQueue } from '../types';

let currentVideoSecondsRemaining = 0;

export const getPlayingSecondsRemaining = (): number => currentVideoSecondsRemaining;
export const setPlayingSecondsRemaining = (value: number): void => {
  currentVideoSecondsRemaining = value;
};

const isDuration = (value: Duration | number): value is Duration => {
  return (
    (value as Duration).seconds !== undefined &&
    (value as Duration).minutes !== undefined &&
    (value as Duration).hours !== undefined
  );
};

export function formatDuration(duration: Duration): string;
export function formatDuration(seconds: number): string;
export function formatDuration(length: Duration | number): string {
  let duration: Duration;

  if (isDuration(length)) {
    duration = length;
  } else {
    const len = moment.duration(length, 'seconds');
    duration = {
      hours: len.hours(),
      minutes: len.minutes(),
      seconds: len.seconds(),
    };
  }

  return (
    (duration.hours
      ? duration.hours + ':' + `${duration.minutes}`.padStart(2, '0')
      : duration.minutes) +
    ':' +
    `${duration.minutes}`.padStart(2, '0')
  );
}

export const toDurationSeconds = (duration: Duration): number => {
  const { hours, minutes, seconds } = duration;
  return (hours ?? 0) * 60 * 60 + (minutes ?? 0) * 60 + (seconds ?? 0);
};

export const getQueueLength = (queue: GuildQueue, includeCurrent = false): string => {
  const totalDurationSeconds =
    queue.videos
      .slice(1)
      .map(v => toDurationSeconds(v.duration as Duration))
      .reduce((a, b) => a + Math.round(b), 0) +
    (includeCurrent ? currentVideoSecondsRemaining ?? 0 : 0);

  const totalDuration = formatDuration(totalDurationSeconds);

  return totalDuration;
};
