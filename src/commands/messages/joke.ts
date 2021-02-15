import axios from 'axios';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandJoke implements Command {
  cmd = 'joke';
  yargs: yargsParser.Options = {
    boolean: ['codepen', 'programming'],
    alias: {
      codepen: 'c',
      programming: 'p',
    },
  };
  docs = [
    {
      usage: 'joke',
      description: 'get a joke (https://sv443.net/jokeapi/v2/)',
    },
    {
      usage: 'joke -p',
      description: 'get a programming joke (https://sv443.net/jokeapi/v2/)',
    },
    {
      usage: 'joke -c',
      description: 'jk no more codepen because they started handing out fat captchas',
    },
  ];

  private makeUrl = (type: string) =>
    `https://jokeapi.dev/joke/${type}?format=txt&blacklistFlags=religious,political`;

  async getGenericJoke(): Promise<string> {
    const response = await axios.get(this.makeUrl('Miscellaneous,Dark,Pun'));
    return response.data;
  }

  async getProgrammingJoke(): Promise<string> {
    const response = await axios.get(this.makeUrl('Programming'));
    return response.data;
  }

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    try {
      let joke: string;

      if (args.codepen)
        return msg.channel.send(Embed.error('codepen jokes were removed because captchas :('));

      msg.channel.startTyping();

      args.programming && (joke ??= await this.getProgrammingJoke());
      joke ??= await this.getGenericJoke();

      msg.channel.send(joke);
    } catch (err) {
      msg.channel.send(Embed.error('error fetching joke', codeBlock(err)));
    }
    msg.channel.stopTyping(true);
  }
}
