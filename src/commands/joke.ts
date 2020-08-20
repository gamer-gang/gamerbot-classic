import axios from 'axios';
import * as cheerio from 'cheerio';
import { Message } from 'discord.js';
import * as he from 'he';
import { Command } from '.';
import { CmdArgs } from '../types';

export class CommandJoke implements Command {
  cmd = 'joke';
  docs = {
    usage: 'joke',
    description: 'Get a joke from Codepen',
  };
  getJoke(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      axios('https://codepen.io/pen/')
        .then(res => {
          if (!res) return reject();
          if (res.status !== 200) return reject();

          const text = cheerio.load(res.data)('#loading-text').html();
          if (!text) return reject('no text in #loading-text');
          resolve(he.decode(text.replace('\n', '').replace(/<\/?code>/g, '`')));
        })
        .catch(err => reject(err));
    });
  }
  async executor({ msg }: CmdArgs): Promise<void | Message> {
    try {
      const joke = await this.getJoke();
      return msg.channel.send(joke);
    } catch (err) {
      return msg.channel.send(`Error getting joke, error message: \n\`\`\`\n${err}\n\`\`\``);
    }
  }
}
