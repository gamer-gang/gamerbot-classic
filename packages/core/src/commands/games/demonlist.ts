import axios, { AxiosResponse } from 'axios';
import { Message, MessageReaction, User } from 'discord.js';
import _ from 'lodash';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { Embed } from '../../util';

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

export class CommandDemonlist implements Command {
  cmd = ['demonlist', 'dlist'];
  docs: CommandDocs = {
    usage: 'demonlist',
    description: 'get top demons',
  };

  makeEmbed(pages: string[][], pageNumber: number): Embed {
    const embed = new Embed({ title: 'Demonlist', description: pages[pageNumber].join('\n') });
    if (pages.length > 1) embed.setFooter(`Page ${pageNumber + 1}/${pages.length}`);
    return embed;
  }

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    msg.channel.startTyping();

    const demons = await demonlistManager.get();
    const demonLines = demons.map(d => `${d.position}. **${d.name}** by **${d.publisher.name}**`);

    msg.channel.stopTyping(true);

    const pages = _.chunk(demonLines, 10);

    const parsedPageNumber = parseInt(args._[0]);
    const parsedValid =
      !Number.isNaN(parsedPageNumber) && parsedPageNumber > 0 && parsedPageNumber < pages.length;

    let pageNumber = parsedValid ? parsedPageNumber - 1 : 0;

    const listMessage = await msg.channel.send(this.makeEmbed(pages, pageNumber));

    if (pages.length > 1) {
      await listMessage.react('◀️');
      await listMessage.react('▶️');
      listMessage
        .createReactionCollector(
          (reaction: MessageReaction, user: User) =>
            ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === msg.author?.id,
          { idle: 60000 }
        )
        .on('collect', (reaction, user) => {
          if (reaction.emoji.name === '▶️') {
            pageNumber++;
            if (pageNumber === pages.length) pageNumber = 0;
          } else {
            pageNumber--;
            if (pageNumber === -1) pageNumber = pages.length - 1;
          }

          listMessage.edit(this.makeEmbed(pages, pageNumber));

          reaction.users.remove(user.id);
        })
        .on('end', () => listMessage.reactions.removeAll());
    }
  }
}
