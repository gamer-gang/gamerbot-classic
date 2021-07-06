import axios from 'axios';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandJoke implements Command {
  cmd = 'joke';
  yargs: yargsParser.Options = {
    boolean: ['codepen', 'programming', 'unsafe'],
    alias: {
      codepen: 'c',
      programming: 'p',
      unsafe: ['u', 'unfiltered', 'dark'],
    },
  };
  docs = [
    {
      usage: 'joke',
      description: 'get a joke (https://jokeapi.dev/); add -u or --unsafe to get the naughty jokes',
    },
    {
      usage: 'joke -p',
      description: 'get a programming joke (https://jokeapi.dev/)',
    },
    {
      usage: 'joke -c',
      description: 'jk no more codepen because they started handing out fat captchas',
    },
  ];

  private makeUrl(type: string, unsafe = false) {
    const params = new URLSearchParams();

    params.set('format', 'txt');

    return `https://v2.jokeapi.dev/joke/${type}?${params.toString()}${
      unsafe ? '' : '&safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit'
    }`;
  }

  async getGenericJoke(unsafe = false): Promise<string> {
    const response = await axios.get(
      this.makeUrl(unsafe ? 'Dark' : 'Miscellaneous,Pun,Spooky,Christmas', unsafe)
    );
    return response.data;
  }

  async getProgrammingJoke(unsafe = false): Promise<string> {
    const response = await axios.get(this.makeUrl('Programming', unsafe));
    return response.data;
  }

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    try {
      let joke: string;

      if (args.codepen)
        return Embed.error('codepen jokes were removed because captchas :(').reply(msg);

      msg.channel.startTyping();

      args.programming && (joke ??= await this.getProgrammingJoke(!!args.unsafe));
      joke ??= await this.getGenericJoke(!!args.unsafe);

      msg.reply(joke);
    } catch (err) {
      Embed.error('error fetching joke', codeBlock(err)).reply(msg);
    }
    msg.channel.stopTyping(true);
  }
}
