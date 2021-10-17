import { Embed } from '@gamerbot/util';
import { MessageActionRow, MessageSelectMenu } from 'discord.js';
import _ from 'lodash';
import { getLogger } from 'log4js';
import yts from 'yt-search';
import { CommandEvent } from '../../../models/CommandEvent';
import { YoutubeTrack } from '../../../models/YoutubeTrack';
import { client } from '../../../providers';

// const parseAgo = (ago: string) => {
//   if (!ago) return Date.now();
//   const [number, type] = ago.replace(/ ago$/g, '').split(' ');
//   return DateTime.now()
//     .minus({ [type]: parseInt(number) })
//     .toMillis();
// };

export const getYoutubeSearch = async ({
  query,
  event,
  ask = false,
}: {
  query: string;
  event: CommandEvent;
  ask?: boolean;
}): Promise<YoutubeTrack[]> => {
  try {
    const search = await yts({ query, category: 'music' });

    const results = search.videos;
    //   args.sort === 'newest'
    //     ? search.videos.sort((a, b) => parseAgo(a.ago) - parseAgo(b.ago))
    //     : args.sort === 'oldest'
    //     ? search.videos.sort((a, b) => parseAgo(b.ago) - parseAgo(a.ago))
    //     : args.sort === 'views'
    //     ? search.videos.sort((a, b) => b.views - a.views)
    //     : args.sort === 'random'
    //     ? _.shuffle(search.videos)
    //     : search.videos;

    if (!results.length) throw new Error('% No results found');

    const list = await client.youtube.videos.list({
      part: ['statistics', 'contentDetails', 'snippet'],
      id: results.slice(0, 20).map(v => v.videoId),
    });

    const tracks = list.data.items
      ?.map(v => ({
        ...v,
        livestream: v.snippet?.liveBroadcastContent === 'live',
      }))
      .map(data => new YoutubeTrack(data));

    if (!tracks?.length) throw new Error('% No results found');

    if (!ask) return [tracks[0]];

    const options = tracks.map((t, i) => ({
      label: _.truncate(t.title, { length: 25 }),
      value: i.toString(),
      description: `${_.truncate(t.data.snippet!.channelTitle!, { length: 37 })} · ${
        t.durationString
      }`,
    }));

    const row = new MessageActionRow({
      components: [
        new MessageSelectMenu({
          customId: 'video',
          placeholder: 'Search results',
          minValues: 1,
          maxValues: options.length,
          options,
        }),
      ],
    });

    await event.editReply({
      embeds: [Embed.info('Select videos to add')],
      components: [row],
    });

    const reply = event.channel.messages.cache.get((await event.fetchReply()).id)!;

    return new Promise(resolve => {
      const collector = reply.createMessageComponentCollector({
        idle: 1000 * 60 * 5,
        filter: interaction => interaction.user.id === event.user.id,
      });

      collector.on('collect', collected => {
        if (!collected.isSelectMenu()) return;
        collector.stop();
      });

      collector.on('end', async collected => {
        const interaction = collected.first()!;
        if (!interaction) return void reply.delete();

        if (!interaction.isSelectMenu()) return;
        const selected = interaction.values.map(v => tracks[parseInt(v)]);
        await interaction.deferUpdate();
        resolve(selected);
      });
    });
  } catch (err) {
    getLogger(`searchYoutube[guild=${event.guild.id}]`).error(err);
    throw err;
  }
};
