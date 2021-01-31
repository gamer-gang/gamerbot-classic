import { Message, PartialMessage } from 'discord.js';
import * as fse from 'fs-extra';
import * as http from 'http';
import * as https from 'https';
import yargsParser from 'yargs-parser';
import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed, regExps, resolvePath } from '../../util';

const fileRegExp = /^[A-Za-z0-9\-_]+$/;
const gifDir = 'data/gifs';

export class CommandGif implements Command {
  cmd = 'gif';
  yargs: yargsParser.Options = {
    boolean: ['list'],
    string: ['remove'],
    array: ['add', 'rename'],
    alias: {
      list: 'l',
      add: 'a',
      remove: ['r', 'rm'],
      rename: ['m', 'mv'],
    },
  };
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
      usage: 'gif -r, --rm, --remove <name>',
      description: 'remove gif',
    },
    {
      usage: 'gif -m, --mv, --rename <name> <newName>',
      description: 'rename gif',
    },
  ];

  invalidChars = (msg: Message | PartialMessage): Promise<Message> =>
    msg.channel.send(
      Embed.error(
        'invalid characters in filename',
        'only letters, numbers, dashes, and underscores allowed'
      )
    );

  async getGifs(ext = false): Promise<string[]> {
    const files = await fse.readdir(resolvePath(gifDir));
    return ext ? files : files.map(f => f.replace('.gif', ''));
  }

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args.list) {
      const files = await this.getGifs();
      if (!files.length) return msg.channel.send(Embed.warning('no gifs stored'));
      return msg.channel.send(Embed.info('files', codeBlock(files.join(', '))));
    }

    if (args.add) return this.add(msg, args);
    else if (args.remove) return this.remove(msg, args);
    else if (args.rename) return this.rename(msg, args);
    else if (args._.length === 1) return this.show(msg, args);
    else
      return msg.channel.send(
        Embed.warning(
          'incorrect usage',
          'usage: \n' + codeBlock(this.docs.map(d => d.usage).join('\n'))
        )
      );
  }

  async show(msg: Message | PartialMessage, args: yargsParser.Arguments): Promise<Message> {
    const name = args._[0];

    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    const gifPath = resolvePath(`${gifDir}/${name}.gif`);

    if (!(await this.getGifs()).includes(name))
      return msg.channel.send(Embed.error('file does not exist'));
    return msg.channel.send({ files: [{ attachment: gifPath }] });
  }

  async add(msg: Message | PartialMessage, args: yargsParser.Arguments): Promise<Message> {
    const files = await this.getGifs();
    const [name, url] = args.add as string[];

    if (!name || !url) return msg.channel.send(Embed.error('expected 2 args for `--add`'));

    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    if (files.includes(name)) return msg.channel.send(Embed.error('filename in use'));
    if (!regExps.url.test(url)) return msg.channel.send(Embed.error('invalid URL'));

    const downloadEmbed = msg.channel.send(Embed.info('downloading...'));
    const gif = await this.downloadGif(name, url);
    (await downloadEmbed).delete();
    return msg.channel.send(gif);
  }

  async remove(msg: Message | PartialMessage, args: yargsParser.Arguments): Promise<Message> {
    const name = args._[0];
    if (!name) return msg.channel.send(Embed.error('`--remove` requires a value'));

    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    if (!(await this.getGifs()).includes(name))
      return msg.channel.send(Embed.error('file does not exist'));

    await fse.remove(resolvePath(`${gifDir}/${name}.gif`));

    return msg.channel.send(Embed.success(`deleted gif ${name}`));
  }

  async rename(msg: Message | PartialMessage, args: yargsParser.Arguments): Promise<Message> {
    const [name, newName] = args.rename as string[];
    if (!name || !newName) return msg.channel.send(Embed.error('expected 2 values for `--rename`'));

    if (!fileRegExp.test(name)) return this.invalidChars(msg);
    if (!(await this.getGifs()).includes(name))
      return msg.channel.send(Embed.error('file does not exist'));

    await fse.rename(resolvePath(`${gifDir}/${name}.gif`), resolvePath(`${gifDir}/${newName}.gif`));

    return msg.channel.send(Embed.success(`renamed gif ${name} to ${newName}`));
  }

  downloadGif(name: string, url: string): Promise<Embed> {
    return new Promise(resolve => {
      const requestModule = url.includes('https://') ? https : http;
      requestModule.get(url, response => {
        response.statusCode = response.statusCode ?? 200;

        // 4xx/5xx error
        if (response.statusCode >= 400 && response.statusCode <= 599)
          return resolve(Embed.error(`received status code ${response.statusCode.toString()}`));

        if (response.headers['content-type'] !== 'image/gif')
          return resolve(Embed.error('incorrect MIME type', 'mime type must be `image/gif`'));

        response.pipe(fse.createWriteStream(resolvePath(`${gifDir}/${name}.gif`)));

        resolve(Embed.success(`done, saved file \`${name}\``));
      });
    });
  }
}
