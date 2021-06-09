import { User } from 'discord.js';
import { DateTime } from 'luxon';

export const getDateFromSnowflake = (id: string): DateTime => {
  return DateTime.fromMillis(parseInt(id.padStart(18, '0'), 10) / 4194304 + 1420070400000);
};

export const getDateStringFromSnowflake = (id: string): [timestamp: string, age: string] => {
  const timestamp = parseInt(id.padStart(18, '0'), 10) / 4194304 + 1420070400000;

  const time = DateTime.fromMillis(timestamp);

  return [time.toLocaleString(DateTime.DATETIME_FULL), time.toRelative() as string];
};

export const getProfileImageUrl = (user: User): string => {
  let icon = user.displayAvatarURL({ size: 4096, dynamic: true });
  if (icon.includes('.webp')) icon = user.displayAvatarURL({ size: 4096, format: 'png' });
  return icon;
};
