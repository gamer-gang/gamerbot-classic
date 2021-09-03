import { Embed } from '@gamerbot/util';
import { Message, Snowflake, User } from 'discord.js';
import { CommandDocs, InternalCommand } from '..';
import { EggLeaderboard } from '../../entities/EggLeaderboard';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandInternalEggModify extends InternalCommand {
  name = ['eggmodify'];
  help: CommandDocs = [
    {
      usage: 'eggmodify <user> (balance|collected) [+-]?<amnt>',
      description: 'add, subtract, or set egg balance',
    },
  ];
  async execute(event: CommandEvent): Promise<void | Message> {
    if (event.isInteraction()) return;

    const [inputUser, inputType, inputAmount] = event.argv;

    console.log(event.argv);

    const user =
      client.users.resolve(inputUser as any) ??
      (client.users.resolve(
        inputUser?.toString().replace(/<@!?(\d+)>/g, '$1') as Snowflake
      ) as User);
    if (!user) return event.reply(Embed.error('Could not resolve user').ephemeral());

    if (inputType !== 'balance' && inputType !== 'collected') return event.reply('Invalid type');

    const operation = /^\+\d+$/.test(inputAmount)
      ? 'add'
      : /^-\d+$/.test(inputAmount)
      ? 'subtract'
      : /^\d+$/.test(inputAmount)
      ? 'set'
      : 'unknown';

    let entry = await event.em.findOne(EggLeaderboard, { userId: user.id });
    let newlyCreated = false;
    if (!entry) {
      newlyCreated = true;
      entry = event.em.create(EggLeaderboard, {
        userId: user.id,
        userTag: user.tag,
        collected: 0,
      });
      event.em.persist(entry);
    }

    if (operation === 'unknown') return event.reply(Embed.error('Invalid operation'));

    let oldValue: bigint;
    let newValue: bigint;

    if (operation === 'set') {
      const amount = parseInt(inputAmount);
      if (isNaN(amount) || !isFinite(amount))
        return event.reply(Embed.error('Set: invalid amount'));

      oldValue = BigInt(entry[inputType]);
      newValue = BigInt(amount);
    } else if (operation === 'add') {
      const amount = parseInt(inputAmount.replace(/^\+/g, ''));
      if (isNaN(amount) || !isFinite(amount))
        return event.reply(Embed.error('Add: invalid amount'));

      oldValue = BigInt(entry[inputType]);
      newValue = oldValue + BigInt(amount);
    } else {
      const amount = parseInt(inputAmount.replace(/^-/g, ''));
      if (isNaN(amount) || !isFinite(amount))
        return event.reply(Embed.error('Subtract: invalid amount'));

      oldValue = BigInt(entry[inputType]);
      newValue = oldValue - BigInt(amount);
    }

    entry[inputType] = newValue;
    await event.em.flush();
    return event.reply(
      Embed.success(
        `Changed **${inputType}** of **${
          entry.userTag
        }** from **${oldValue.toString()}** to **${newValue.toLocaleString()}**`
      )
    );
  }
}
