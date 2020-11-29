import _ from 'lodash';
import moment from 'moment';
import { Duration } from 'simple-youtube-api';

import { GuildQueue, TrackType } from '../types';

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
    duration = fromMoment(len);
  }

  return [
    duration.hours ?? '',
    (duration.minutes ?? 0).toString().padStart(2, '0'),
    (duration.seconds ?? 0).toString().padStart(2, '0'),
  ].join(':');
}

const fromMoment = (duration?: moment.Duration): Duration =>
  duration
    ? {
        hours: duration.hours(),
        minutes: duration.minutes(),
        seconds: duration.seconds(),
      }
    : { hours: 0, minutes: 0, seconds: 0 };

export const toDuration = (
  amount?: number | moment.Duration,
  type?: moment.unitOfTime.DurationConstructor
): Duration =>
  fromMoment(typeof amount === 'number' ? moment.duration(amount, type ?? 'seconds') : amount);

export const toDurationSeconds = (duration: Duration): number => {
  const { hours, minutes, seconds } = duration;
  return (hours ?? 0) * 60 * 60 + (minutes ?? 0) * 60 + (seconds ?? 0);
};

export const getRemainingTime = (queue: GuildQueue): number => {
  if (!queue.playing || !queue.voiceConnection?.dispatcher) return 0;
  return (
    toDurationSeconds(queue.tracks[queue.current.index].data.duration) -
    Math.floor(
      queue.voiceConnection.dispatcher.totalStreamTime - queue.voiceConnection.dispatcher.pausedTime
    ) /
      1000
  );
};

export const getQueueLength = (queue: GuildQueue): string => {
  if (queue.tracks.find(v => v.type === 'youtube' && v.data.livestream)) return '?';

  const totalDurationSeconds = queue.tracks
    .map(t => toDurationSeconds(t.data.duration as Duration))
    .reduce((a, b) => a + Math.round(b), 0);

  return formatDuration(isNaN(totalDurationSeconds) ? 0 : totalDurationSeconds);
};
