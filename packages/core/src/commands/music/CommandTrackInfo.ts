import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandTrackInfo extends Command {
  cmd = ['trackinfo'];
  docs: CommandDocs = [
    {
      usage: 'trackinfo',
      description: 'show current track details',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Show details for current track',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!queue.playing) return event.reply(Embed.error('Nothing playing').ephemeral());

    const track = queue.tracks[queue.index];

    const embed = new Embed({
      title: track.title,
      description: track.url,
    });

    if (track.isYoutube()) {
      embed.addField('Channel', track.authorMarkup, true);
      embed.addField('Duration', track.durationString, true);

      const date = DateTime.fromISO(track.data.snippet?.publishedAt as string);
      embed.addField(
        'Published at',
        `${date.toLocaleString(DateTime.DATETIME_FULL)}, ${date.toRelative()}`,
        true
      );

      embed.addField(
        'Views',
        track.data.statistics?.viewCount
          ? parseInt(track.data.statistics?.viewCount).toLocaleString()
          : 'Unknown',
        true
      );
      embed.addField(
        'Rating',
        `👍 ${
          track.data.statistics?.likeCount
            ? parseInt(track.data.statistics?.likeCount).toLocaleString()
            : '?'
        } 👎 ${
          track.data.statistics?.dislikeCount
            ? parseInt(track.data.statistics?.dislikeCount).toLocaleString()
            : '?'
        }`,
        true
      );

      embed.addField(
        'Comment count',
        track.data.statistics?.commentCount
          ? parseInt(track.data.statistics?.commentCount).toLocaleString()
          : 'Unknown',
        true
      );

      embed.addField(
        'Description',
        _.truncate(track.data.snippet?.description ?? 'None', { length: 900 })
      );

      track.coverUrl && embed.setThumbnail(track.coverUrl);
    } else if (track.isSpotify()) {
      embed.addField(`Artist${track.data.artists.length > 1 ? 's' : ''}`, track.authorMarkup, true);
      embed.addField('Duration', track.durationString, true);

      track.coverUrl && embed.setThumbnail(track.coverUrl);
    } else if (track.isFile()) {
      embed.addField('Uploaded by', `<@${track.requesterId}>`, true);
      embed.addField('Duration', track.durationString, true);
    }

    event.reply(embed);
  }
}
