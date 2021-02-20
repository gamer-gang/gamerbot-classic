import moment from 'moment';

const isDuration = (value: moment.Duration | number): value is moment.Duration => {
  return (
    (value as moment.Duration).seconds !== undefined &&
    (value as moment.Duration).minutes !== undefined &&
    (value as moment.Duration).hours !== undefined
  );
};

export function formatDuration(duration: moment.Duration): string;
export function formatDuration(seconds: number): string;
export function formatDuration(length: moment.Duration | number): string {
  let duration: moment.Duration;

  if (isDuration(length)) {
    duration = length;
  } else {
    duration = moment.duration(length, 'seconds');
  }

  return [
    duration.hours() ?? '',
    (duration.minutes() ?? 0).toString().padStart(2, '0'),
    (duration.seconds() ?? 0).toString().padStart(2, '0'),
  ].join(':');
}

// export const toDuration = (
//   amount?: number | moment.Duration,
//   type?: moment.unitOfTime.DurationConstructor
// ): Duration =>
//   fromMoment(typeof amount === 'number' ? moment.duration(amount, type ?? 'seconds') : amount);

// export const toDurationSeconds = (duration: Duration): number => {
//   const { hours, minutes, seconds } = duration;
//   return (hours ?? 0) * 60 * 60 + (minutes ?? 0) * 60 + (seconds ?? 0);
// };
