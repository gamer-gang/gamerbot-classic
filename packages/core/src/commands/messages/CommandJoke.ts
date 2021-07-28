import { codeBlock, Embed } from '@gamerbot/util';
import axios from 'axios';
import { Message } from 'discord.js';
import { Command, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandJoke extends Command {
  cmd = ['joke'];
  docs = [
    {
      usage: 'joke',
      description: 'get a joke (https://jokeapi.dev/); add -u or --unsafe to get the naughty jokes',
    },
    {
      usage: 'joke -p',
      description: 'get a programming joke (https://jokeapi.dev/)',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Display a joke',
    options: [
      {
        name: 'type',
        description: 'Joke type',
        type: 'STRING',
        choices: [
          {
            name: 'normal',
            value: 'normal',
          },
          {
            name: 'programming',
            value: 'programming',
          },
          {
            name: 'dark',
            value: 'dark',
          },
        ],
      },
    ],
  };
  private makeUrl(type: string, dark = false) {
    const params = new URLSearchParams();

    params.set('format', 'txt');

    return `https://v2.jokeapi.dev/joke/${type}?${params.toString()}${
      dark ? '' : '&safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit'
    }`;
  }

  async getGenericJoke(dark = false): Promise<string> {
    const response = await axios.get(
      this.makeUrl(dark ? 'Dark' : 'Miscellaneous,Pun,Spooky,Christmas', dark)
    );
    return response.data;
  }

  async getProgrammingJoke(dark = false): Promise<string> {
    const response = await axios.get(this.makeUrl('Programming', dark));
    return response.data;
  }

  async execute(event: CommandEvent): Promise<void | Message> {
    const type = ((event.isInteraction() ? event.options.getString('type') : event.argv[0]) ??
      'normal') as 'normal' | 'programming' | 'dark';

    if (!['normal', 'programming', 'dark'].includes(type))
      return event.reply(
        Embed.error('Invalid type', 'Valid types: normal, programming, dark').ephemeral()
      );

    try {
      await event.defer();

      const joke =
        type === 'dark'
          ? this.getGenericJoke(true)
          : type === 'programming'
          ? this.getProgrammingJoke(false)
          : this.getGenericJoke(false);

      event.editReply(await joke);
    } catch (err) {
      event.editReply(Embed.error('Error fetching joke', codeBlock(err)).ephemeral());
    }
  }
}
