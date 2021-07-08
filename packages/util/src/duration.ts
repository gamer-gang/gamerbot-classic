import { Duration } from 'luxon';

export const normalizeDuration = (duration: Duration): Duration =>
  Duration.fromObject({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    ...duration.toObject(),
  }).normalize();

export function formatDuration(duration: Duration): string;
export function formatDuration(seconds: number): string;
export function formatDuration(length: Duration | number): string {
  let duration: Duration;

  if (Duration.isDuration(length)) duration = normalizeDuration(length);
  else duration = normalizeDuration(Duration.fromObject({ seconds: length }));

  if (duration.years || duration.months || duration.days) {
    const obj = duration.normalize().toObject();

    const units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

    const segments = units.map(unit => {
      const count = obj[unit];
      return count && `${count} ${unit.replace(/s$/, '')}${count > 1 ? 's' : ''}`;
    });

    return segments.filter(part => !!part).join(', ');
  }

  return [
    duration.hours,
    (duration.minutes ?? 0).toString().padStart(2, '0'),
    Math.round(duration.seconds ?? 0)
      .toString()
      .padStart(2, '0'),
  ]
    .filter(part => !!part)
    .join(':');
}

export const delay =
  (ms: number) =>
  <T>(value: T): Promise<T> =>
    new Promise<T>(resolve => setTimeout(() => resolve(value), ms));
