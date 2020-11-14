import axios from 'axios';
import cheerio from 'cheerio';
import { Message } from 'discord.js';
import he from 'he';
import yargsParser from 'yargs-parser';

import { Command } from '..';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandJoke implements Command {
  cmd = 'joke';
  yargsSchema: yargsParser.Options = {
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
      description: 'get a joke from codepen (may take a while)',
    },
  ];

  async getCodepenJoke(): Promise<string> {
    const response = await axios.get('https://codepen.io/pen/');
    if (response.status !== 200) throw new Error('response code ' + response.status);

    const text = cheerio.load(response.data)('#loading-text').html();
    if (!text) throw new Error('no text in #loading-text');

    return he.decode(text.replace('\n', '').replace(/<\/?code>/g, '`'));
  }

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

      args.codepen && (joke ??= await this.getCodepenJoke());
      args.programming && (joke ??= await this.getProgrammingJoke());
      joke ??= await this.getGenericJoke();

      return msg.channel.send(joke);
    } catch (err) {
      return msg.channel.send(Embed.error('error fetching joke', `\`\`\`\n${err}\n\`\`\``));
    }
  }
}
