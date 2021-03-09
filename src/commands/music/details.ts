import { Message } from 'discord.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandDetails implements Command {
  cmd = 'details';
  docs: CommandDocs = {
    usage: 'details',
    description: 'show current track details',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;

    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('Nothing playing'));

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
      embed.addField('Uploaded by', `<@!${track.requesterId}>`, true);
      embed.addField('Duration', track.durationString, true);
    }

    msg.channel.send(embed);
  }
}
