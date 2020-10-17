import axios from 'axios';
import cheerio from 'cheerio';
import { Message } from 'discord.js';
import he from 'he';
import yargsParser from 'yargs-parser';

import { Command } from '..';
import { CmdArgs } from '../../types';

export class CommandJoke implements Command {
  cmd = 'joke';
  yargsSchema: yargsParser.Options = {
    boolean: ['codepen', 'programming'],
    alias: {
      codepen: 'c',
      programming: 'p'
    }
  }
  docs = [
    {
      usage: 'joke',
      description: 'get a joke from https://github.com/15Dkatz/official_joke_api',
    },
    {
      usage: 'joke -p',
      description: 'get a programming joke from https://github.com/15Dkatz/official_joke_api',
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
  async getGenericJoke(): Promise<string> {
    const response = await axios.get('https://official-joke-api.appspot.com/jokes/random');
    return `${response.data.setup}\n${response.data.punchline}`;
  }
  async getProgrammingJoke(): Promise<string> {
    const response = await axios.get(
      'https://official-joke-api.appspot.com/jokes/programming/random'
    );
    return `${response.data[0].setup}\n${response.data[0].punchline}`;
  }
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    try {
      let joke: string;

      args.codepen && (joke ??= await this.getCodepenJoke());
      args.programming && (joke ??= await this.getProgrammingJoke());
      joke ??= await this.getGenericJoke();

      return msg.channel.send(joke);
    } catch (err) {
      return msg.channel.send(`Error getting joke, error message: \n\`\`\`\n${err}\n\`\`\``);
    }
  }
}
