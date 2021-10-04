import { bold } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import axios, { AxiosResponse } from 'axios';
import { Message, MessageActionRow, MessageButton, MessageComponentInteraction } from 'discord.js';
import _ from 'lodash';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

const BASE_URL = 'https://pointercrate.com/api';

class DemonlistManager {
  #cache: Pointercrate.ListedDemon[] = [];
  #cacheTime = 0;

  async get(): Promise<Pointercrate.ListedDemon[]> {
    if (this.#cache && Date.now() - this.#cacheTime < 1000 * 60 * 5) return [...this.#cache];

    const responses: AxiosResponse<Pointercrate.ListedDemon[]>[] = await Promise.all(
      [0, 50, 100].map(after =>
        axios.get(`/v2/demons/listed/?after=${after}`, {
          baseURL: BASE_URL,
          headers: { Accept: 'application/json' },
        })
      )
    );

    this.#cache = responses.flatMap(r => r.data);
    this.#cacheTime = Date.now();

    return this.#cache;
  }
}

const demonlistManager = new DemonlistManager();

export class CommandDemonlist extends ChatCommand {
  name = ['demonlist', 'dlist'];
  help: CommandDocs = [
    {
      usage: 'demonlist',
      description: 'get top demons',
    },
  ];
  data: CommandOptions = {
    description: 'Get top demons',
    options: [
      {
        name: 'page',
        description: 'Start on a page other than the first',
        type: 'INTEGER',
      },
    ],
  };
  makeEmbed(pages: string[][], pageNumber: number): Embed {
    const embed = new Embed({ title: 'Demonlist', description: pages[pageNumber].join('\n') });
    if (pages.length > 1) embed.setFooter(`Page ${pageNumber + 1}/${pages.length}`);
    return embed;
  }

  async execute(event: CommandEvent): Promise<void | Message> {
    await event.deferReply();

    const demons = await demonlistManager.get();
    const demonLines = demons.map(
      d => `${d.position}. ${bold(d.name)} by ${bold(d.publisher.name)}`
    );

    const pages = _.chunk(demonLines, 10);

    const parsedPageNumber = event.isInteraction()
      ? event.options.getInteger('page') ?? 1
      : parseInt(event.argv[0]);
    const parsedValid =
      !Number.isNaN(parsedPageNumber) && parsedPageNumber > 0 && parsedPageNumber < pages.length;

    let pageNumber = parsedValid ? parsedPageNumber - 1 : 0;

    if (pages.length === 1) {
      await event.editReply({ embeds: [this.makeEmbed(pages, pageNumber)] });
    } else {
      const row = new MessageActionRow({
        components: [
          new MessageButton({ customId: 'prev', style: 'SECONDARY', emoji: '◀️' }),
          new MessageButton({ customId: 'next', style: 'SECONDARY', emoji: '▶️' }),
        ],
      });

      await event.editReply({ embeds: [this.makeEmbed(pages, pageNumber)], components: [row] });

      const reply = event.channel.messages.cache.get((await event.fetchReply()).id)!;

      reply
        .createMessageComponentCollector({
          filter: (interaction: MessageComponentInteraction) =>
            interaction.user.id === event.user.id,
          idle: 1000 * 10,
        })
        .on('collect', interaction => {
          if (interaction.customId === 'next') {
            pageNumber++;
            if (pageNumber === pages.length) pageNumber = 0;
          } else {
            pageNumber--;
            if (pageNumber === -1) pageNumber = pages.length - 1;
          }

          interaction.update({
            embeds: [this.makeEmbed(pages, pageNumber)],
            components: [row],
          });
        })
        .on('end', () => {
          reply.edit({
            embeds: [this.makeEmbed(pages, pageNumber)],
            components: [],
          });
        });
    }
  }
}
