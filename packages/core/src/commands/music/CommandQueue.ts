import { Embed, formatDuration } from '@gamerbot/util';
import { Message, MessageActionRow, MessageButton, MessageComponentInteraction } from 'discord.js';
import _ from 'lodash';
import { Command, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { Queue } from '../../models/Queue';
import { client } from '../../providers';

export class CommandQueue extends Command {
  cmd = ['queue', 'q'];
  docs = [{ usage: 'queue', description: 'list the things!!!!!' }];
  commandOptions: CommandOptions = {
    description: 'List tracks currently in queue',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    const tracks = _.cloneDeep(queue.tracks);
    if (!tracks.length) return event.reply(Embed.info('Nothing in queue'));

    const playing = await queue.playing;
    const remainingTime = await queue.remainingTime();

    const queueLines = tracks.map(
      (track, i) =>
        `${i + 1}. **${track.titleMarkup}** (${track.durationString})${
          playing && queue.index === i ? ` **(${formatDuration(remainingTime)} remaining)**` : ''
        }`
    );

    const queueSegments = _.chunk(queueLines, 10);
    // start on page with current track
    let pageNumber = Math.floor(queue.index / 10);

    const row = new MessageActionRow({
      components: [
        new MessageButton({ customId: 'prev', style: 'SECONDARY', emoji: '◀️' }),
        new MessageButton({ customId: 'next', style: 'SECONDARY', emoji: '▶️' }),
      ],
    });

    if (queueSegments.length === 1) {
      event.reply(this.makeEmbed({ queueSegments, pageNumber, queue }));
    } else {
      await event.reply({
        embeds: [this.makeEmbed({ queueSegments, pageNumber, queue })],
        components: [row],
      });

      const reply = event.channel.messages.cache.get((await event.fetchReply()).id)!;
      reply
        .createMessageComponentCollector({
          idle: 60 * 1000,
          filter: (interaction: MessageComponentInteraction) =>
            interaction.user.id === event.user.id,
        })
        .on('collect', interaction => {
          if (interaction.customId === 'prev') {
            pageNumber++;
            if (pageNumber === queueSegments.length) pageNumber = 0;
          } else {
            pageNumber--;
            if (pageNumber === -1) pageNumber = queueSegments.length - 1;
          }

          interaction.update({
            embeds: [this.makeEmbed({ queueSegments, pageNumber, queue })],
            components: [row],
          });
        })
        .on('end', () => {
          reply.edit({
            embeds: [this.makeEmbed({ queueSegments, pageNumber, queue })],
            components: [],
          });
        });
    }
  }

  // TODO: move into queue class

  makeEmbed({
    pageNumber,
    queueSegments,
    queue,
  }: {
    pageNumber: number;
    queueSegments: string[][];
    queue: Queue;
  }): Embed {
    const embed = new Embed({
      title: 'Queue ' + queue.loopSymbol,
      description:
        `**Tracks:** ${queue.tracks.length}\n` +
        `**Total length:** ${queue.length}\n` +
        `${queueSegments[pageNumber].join('\n')}`,
    });

    if (queueSegments.length > 1) embed.setFooter(`Page ${pageNumber + 1}/${queueSegments.length}`);

    return embed;
  }
}
