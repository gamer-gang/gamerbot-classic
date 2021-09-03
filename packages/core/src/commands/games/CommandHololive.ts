import { Embed } from '@gamerbot/util';
import axios from 'axios';
import { Message } from 'discord.js';
import { DateTime } from 'luxon';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandHololive extends ChatCommand {
  name = ['hololive'];
  help = [{ usage: 'hololive schedule', description: 'show live and upcoming streams' }];
  data: CommandOptions = {
    description: 'Hololive related stuff (WIP)',
    options: [
      {
        name: 'schedule',
        description: 'Show live and upcoming streams (WIP)',
        type: 'SUB_COMMAND',
      },
    ],
  };
  async fetch(): Promise<string[]> {
    const response = await axios.get('https://api.holotools.app/v1/live');

    const data = response.data as Holotools.LiveResponse;

    const titleExtras =
      /(?:【[^】]*?\/ホロ(ライブ|スターズ).*?】|【ホロ(ライブ|スターズ).*?\/.*?】|#[^\d][^ 【】]*)/gi;

    const sorted = [...data.ended, ...data.live, ...data.upcoming].sort(
      (a, b) =>
        DateTime.fromISO(a.live_schedule).diffNow().as('seconds') -
        DateTime.fromISO(b.live_schedule).diffNow().as('seconds')
    );

    const text = sorted.flatMap(s => {
      if (/freee* ?chat/gi.test(s.title)) return [];
      const date = DateTime.fromISO(s.live_schedule).diffNow().toFormat('d:hh:mm:ss');
      const formattedDate = (date.includes('-') ? '-' : '') + date.replace(/-/g, '');
      return `${s.status.padEnd(8)} | youtu.be/${s.yt_video_key} | ${formattedDate.padStart(
        11
      )} | ${s.title.replace(titleExtras, '')} | ${s.channel.name}`;
    });

    return text;
  }
  async execute(event: CommandEvent): Promise<void | Message> {
    const subcommand = event.isInteraction() ? event.options.getSubcommand() : event.argv[0];

    if (subcommand !== 'schedule')
      return event.reply(Embed.error('Invalid subcommand', 'Valid commands: schedule').ephemeral());

    if (subcommand === 'schedule') {
      await event.defer();

      const text = await this.fetch();

      event.editReply({
        files: [{ name: 'schedule.apache', attachment: Buffer.from(text.join('\n')) }],
      });

      // const pages = text
      //   .join('\n')
      //   .match(/(?:.|\n){1,1900}(\n|$)/g)
      //   ?.map(message => codeBlock(message)) as string[];

      // const parsedPageNumber = event.isInteraction()
      //   ? event.options.getInteger('page') ?? 1
      //   : parseInt(event.argv[0]);
      // const parsedValid =
      //   !Number.isNaN(parsedPageNumber) && parsedPageNumber > 0 && parsedPageNumber < pages.length;

      // let pageNumber = parsedValid ? parsedPageNumber - 1 : 0;

      // if (pages.length === 1) {
      //   await event.editReply(pages[pageNumber]);
      // } else {
      //   const row = new MessageActionRow({
      //     components: [
      //       new MessageButton({ customId: 'prev', style: 'SECONDARY', emoji: '◀️' }),
      //       new MessageButton({ customId: 'next', style: 'SECONDARY', emoji: '▶️' }),
      //     ],
      //   });

      //   await event.editReply({
      //     content: pages[pageNumber],
      //     components: [row],
      //   });

      //   const reply = event.channel.messages.cache.get((await event.fetchReply()).id)!;

      //   reply
      //     .createMessageComponentCollector({
      //       filter: (interaction: MessageComponentInteraction) =>
      //         interaction.user.id === event.user.id,
      //       idle: 1000 * 60 * 5,
      //     })
      //     .on('collect', interaction => {
      //       if (interaction.customId === 'next') {
      //         pageNumber++;
      //         if (pageNumber === pages.length) pageNumber = 0;
      //       } else {
      //         pageNumber--;
      //         if (pageNumber === -1) pageNumber = pages.length - 1;
      //       }

      //       interaction.update({
      //         content: pages[pageNumber],
      //         components: [row],
      //       });
      //     })
      //     .on('end', () => {
      //       reply.edit({
      //         content: pages[pageNumber],
      //         components: [],
      //         flags: MessageFlags.FLAGS.SUPPRESS_EMBEDS,
      //       });
      //     });
      // }
    }
  }
}
