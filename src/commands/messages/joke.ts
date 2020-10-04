import axios from 'axios';
import cheerio from 'cheerio';
import { Message } from 'discord.js';
import he from 'he';

import { Command } from '..';
import { CmdArgs } from '../../types';
import { hasFlags } from '../../util';

export class CommandJoke implements Command {
  cmd = 'joke';
  docs = [
    {
      usage: 'joke',
      description: 'get a progamming joke from https://github.com/15Dkatz/official_joke_api',
    },
    {
      usage: 'joke -g',
      description: 'get a generic joke from https://github.com/15Dkatz/official_joke_api',
    },
    {
      usage: 'joke -c',
      description: 'Get a joke from codepen (may take a while)',
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
  async executor({ msg, flags }: CmdArgs): Promise<void | Message> {
    try {
      let joke: string;

      hasFlags(flags, ['-c', '--codepen']) && (joke ??= await this.getCodepenJoke());
      hasFlags(flags, ['-g', '--generic']) && (joke ??= await this.getGenericJoke());
      joke ??= await this.getProgrammingJoke();

      return msg.channel.send(joke);
    } catch (err) {
      return msg.channel.send(`Error getting joke, error message: \n\`\`\`\n${err}\n\`\`\``);
    }
  }
}
