import { Message, MessageReaction, User } from 'discord.js';

import { Config } from '../../../entities/Config';
import { CmdArgs } from '../../../types';
import { Embed, parseDiscohookJSON } from '../../../util';

export const welcomeMessage = async (
  config: Config,
  cmdArgs: CmdArgs,
  value?: string
): Promise<void | Message | Message[]> => {
  const { msg } = cmdArgs;

  const replace = (json: string) =>
    json
      .replace('%USER%', `<@!${msg.author?.id}>`)
      .replace('%USERTAG%', `${msg.author?.tag}`)
      .replace('%GUILD%', `${msg.guild?.name}`);

  if (!msg.guild?.member(msg.author?.id as string)?.hasPermission('ADMINISTRATOR'))
    return msg.channel.send(
      new Embed({ intent: 'error', title: 'you are missing `ADMINISTRATOR` permission' })
    );

  if (!value) {
    if (!config.welcomeJson)
      return msg.channel.send(new Embed({ intent: 'warning', title: 'no welcome message set' }));
    await msg.channel.send(
      new Embed({
        title: `${msg.guild.name}: current welcome message (\`$config welcomeMessage unset\` to remove)`,
        description: '```json\n' + config.welcomeJson + '\n```',
      })
    );

    return msg.channel.send(parseDiscohookJSON(replace(config.welcomeJson)));
  }

  if (value === 'unset') {
    delete config.welcomeJson;
    return msg.channel.send(new Embed({ intent: 'warning', title: 'unset welcome message' }));
  }

  try {
    if (config.welcomeJson) {
      await msg.channel.send('existing welcome message: ');
      await msg.channel.send(parseDiscohookJSON(replace(config.welcomeJson)));

      const confirmation = await msg.channel.send('replace this welcome message with a new one?');

      const collector = confirmation.createReactionCollector(
        (reaction: MessageReaction, user: User) =>
          ['✅', '❌'].includes(reaction.emoji.name) && user.id === msg.author?.id,
        { idle: 15000 }
      );

      collector.on('collect', (reaction, user) => {
        if (reaction.emoji.name === '❌') return msg.channel.send('cancelled');
        collector.stop();
        confirmMessage(value, config, cmdArgs);
      });

      await confirmation.react('✅');
      confirmation.react('❌');
      return;
    }

    confirmMessage(value, config, cmdArgs);
  } catch (err) {
    msg.channel.send('error: \n```\n' + err + '\n```');
  }
};

const confirmMessage = async (json: string, config: Config, cmdArgs: CmdArgs) => {
  const { msg } = cmdArgs;

  const replace = (json: string) =>
    json
      .replace('%USER%', `<@!${msg.author?.id}>`)
      .replace('%USERTAG%', `${msg.author?.tag}`)
      .replace('%GUILD%', `${msg.guild?.name}`);

  await msg.channel.send(parseDiscohookJSON(replace(json)));
  const confirmation = await msg.channel.send('set this as the welcome message?');

  const collector = confirmation.createReactionCollector(
    (reaction: MessageReaction, user: User) =>
      ['✅', '❌'].includes(reaction.emoji.name) && user.id === msg.author?.id,
    { idle: 15000 }
  );

  collector.on('collect', reaction => {
    if (reaction.emoji.name === '❌') return msg.channel.send('cancelled');

    config.welcomeJson = JSON.stringify(JSON.parse(json));

    if (!config.welcomeChannelId)
      msg.channel.send(
        new Embed({
          intent: 'warning',
          title:
            'message set successfully\nwarning: no welcome channel set, will default to system message channel',
        })
      );
    else msg.channel.send(new Embed({ intent: 'success', title: 'new welcome message set' }));
  });

  await confirmation.react('✅');
  confirmation.react('❌');
};
