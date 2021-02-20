import { DateTime } from 'luxon';

export const getDateFromSnowflake = (id: string): [timestamp: string, age: string] => {
  const timestamp = parseInt(id.padStart(18, '0'), 10) / 4194304 + 1420070400000;

  const time = DateTime.fromMillis(timestamp);

  return [time.toLocaleString(DateTime.DATETIME_FULL), time.toRelative() as string];
};
