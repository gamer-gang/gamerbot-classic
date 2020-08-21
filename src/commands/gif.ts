import { Message, PartialMessage } from 'discord.js';
import * as fse from 'fs-extra';
import * as http from 'http';
import * as https from 'https';
import { Command } from '.';
import { CmdArgs } from '../types';
import { hasFlag, resolvePath, spliceFlags } from '../util';

const fileRegExp = /^[A-Za-z0-9\-_]+$/;
const urlRegExp = /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
const gifDir = 'data/gifs';

export class CommandGif implements Command {
  cmd = 'gif';
  docs = [
    {
      usage: 'gif <filename>',
      description: 'see gif',
    },
    {
      usage: 'gif -l, --list',
      description: 'list gif',
    },
    {
      usage: 'gif -a, --add <name> <url>',
      description: 'add gif',
    },
    {
      usage: 'gif -r, --remove <name>',
      description: 'remove gif',
    },
    {
      usage: 'gif -n, --rename <name> <newName>',
      description: 'rename gif',
    },
  ];
  invalidChars = (msg: Message | PartialMessage) =>
    msg.channel.send(
      `invalid chars in filename, allowed chars:\n\`\`\`\n${fileRegExp.toString()}\n\`\`\``
    );

  async getGifs(ext = false): Promise<string[]> {
    const files = await fse.readdir(resolvePath(gifDir));
    return ext ? files : files.map(f => f.replace('.gif', ''));
  }

  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, flags } = cmdArgs;

    if (args.length == 0)
      return msg.channel.send(`usage: \`${this.docs.map(d => d.usage).join('`, `')}\``);

    const unrecognized = args.filter(
      v => v[0] === '-' && !'l|-list|a|-add|r|-remove|n|-rename'.split('|').includes(v.substr(1))
    );
    if (unrecognized.length > 0)
      return msg.channel.send(`unrecognized flags: \`${unrecognized.join('`, `')}\``);

    if (hasFlag(flags, '-l', '--list')) {
      const files = await this.getGifs();
      return msg.channel.send(`files: \n\`\`\`\n${files.join(', ')}\n\`\`\``);
    }

    if (hasFlag(flags, '-a', '--add')) {
      spliceFlags(flags, args, '-a', '--add');
      return this.add(msg, args);
    }

    if (hasFlag(flags, '-r', '--remove')) {
      spliceFlags(flags, args, '-r', '--remove');
      return this.remove(msg, args);
    }

    if (hasFlag(flags, '-n', '--rename')) {
      spliceFlags(flags, args, '-n', '--rename');
      return this.remove(msg, args);
    }

    return this.show(msg, args);
  }
  async show(msg: Message | PartialMessage, args: string[]) {
    const name = args[0];
    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    const gifPath = resolvePath(`${gifDir}/${name}.gif`);

    if (!(await this.getGifs()).includes(name)) return msg.channel.send("file doest't exist m8");
    return msg.channel.send({ files: [{ attachment: gifPath }] });
  }

  async add(msg: Message | PartialMessage, args: string[]) {
    const files = await this.getGifs();
    const [name, url] = args;

    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    if (files.includes(name)) return msg.channel.send('filename in use');
    if (!urlRegExp.test(url)) return msg.channel.send('invalid url');

    msg.channel.send('downloading...');
    return msg.channel.send(await this.downloadGif(name, url));
  }

  async remove(msg: Message | PartialMessage, args: string[]) {
    const name = args[0];
    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    if (!(await this.getGifs()).includes(name)) return msg.channel.send("file doesn't exist m8");
    await fse.remove(resolvePath(`${gifDir}/${name}.gif`));
    return msg.channel.send(`deleted gif ${name}`);
  }

  async rename(msg: Message | PartialMessage, args: string[]) {
    const [name, newName] = args;
    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    if (!(await this.getGifs()).includes(name)) return msg.channel.send("file doesn't exist m8");
    await fse.rename(resolvePath(`${gifDir}/${name}.gif`), resolvePath(`${gifDir}/${newName}.gif`));
    return msg.channel.send(`renamed gif ${name} to ${newName}`);
  }

  downloadGif(name: string, url: string): Promise<string> {
    return new Promise(resolve => {
      const requestModule = url.includes('https://') ? https : http;
      requestModule.get(url, response => {
        response.statusCode = response.statusCode ?? 200;

        // 4xx/5xx error
        if (response.statusCode >= 400 && response.statusCode <= 599)
          return resolve(`received status code ${response.statusCode.toString()}`);

        if (response.headers['content-type'] !== 'image/gif')
          return resolve('incorrect mime type, must be `image/gif`');

        response.pipe(fse.createWriteStream(resolvePath(`${gifDir}/${name}.gif`)));

        resolve('done, saved file ' + name);
      });
    });
  }
}
