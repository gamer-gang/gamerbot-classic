import { Message } from 'discord.js';
import { Command } from '.';
import { CmdArgs } from '../types';
import { hasFlags, hasMentions, spliceFlag } from '../util';

export class CommandSpam implements Command {
  cmd = 'spam';
  docs = {
    usage: 'spam [-r reptitions=5] [-m messages=4] <...text>',
    description: 'make the words appear on the screen',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, configStore, flags } = cmdArgs;

    if (!configStore.get(msg.guild?.id as string).allowSpam) {
      return msg.channel.send('spam commands are off');
    }

    const prefix = configStore.get(msg.guild?.id as string).prefix;

    if (msg.content?.includes('/cow') && msg.author?.id !== process.env.OWNER_ID) {
      return msg.channel.send('owner only');
    }

    const unrecognized = Object.keys(flags).filter(
      v => !'r|m|t|-tts'.split('|').includes(v.substr(1))
    );
    if (unrecognized.length > 0)
      return msg.channel.send(`unrecognized flag(s): \`${unrecognized.join('`, `')}\``);

    let repetitions = 5;
    let messages = 4;
    if (hasFlags(flags, ['-r'])) {
      let providedReps = parseInt(spliceFlag(flags, args, '-r', true) as string);
      if (!isNaN(providedReps)) repetitions = providedReps;
      else return msg.channel.send('invalid repetition count');
    }
    if (hasFlags(flags, ['-m'])) {
      let providedMsgs = parseInt(spliceFlag(flags, args, '-m', true) as string);
      if (!isNaN(providedMsgs)) {
        messages = providedMsgs;
        if (providedMsgs > 50) return msg.channel.send('too many messages');
      } else return msg.channel.send('invalid message count');
    }

    if (hasMentions(msg.content!)) return msg.channel.send('yea i aint doin that');

    if (!args[0])
      return msg.channel.send(`no text to send\nusage: \`${prefix}${this.docs.usage}\``);

    let tts = false;
    if (hasFlags(flags, ['-t', '--ts'])) {
      spliceFlag(flags, args, '-t');
      spliceFlag(flags, args, '--tts');
      tts = true;
    }

    let output = '';
    let spamText = args.join(' ');

    if (args[1] == 'fill') {
      while (true) {
        if (output.length + spamText.length + 1 > 2000) break;
        output += ' ' + spamText;
      }
    } else {
      if ((spamText.length + 1) * repetitions > 2000)
        return msg.channel.send(
          'too many reps (msg is over 2000 chars), use "fill" to fill the entire message'
        );

      for (let i = 0; i < repetitions; i++) output += ' ' + spamText;
    }

    for (let i = 0; i < messages; i++) {
      if (tts) msg.channel.send(output, { tts: true });
      else msg.channel.send(output);
    }
  }
}
