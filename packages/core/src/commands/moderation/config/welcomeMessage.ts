import { Context } from '@gamerbot/types';
import { codeBlock, Embed, parseDiscohookJSON } from '@gamerbot/util';
import { Message, MessageReaction, User } from 'discord.js';
import { Config } from '../../../entities/Config';

const replacer = (msg: Context['msg']) => (json: string) =>
  json
    .replace(/%USER%/g, `<@${msg.author.id}>`)
    .replace(/%USERTAG%/g, `${msg.author.tag}`)
    .replace(/%GUILD%/g, `${msg.guild.name}`);

export const welcomeMessage = async (
  config: Config,
  context: Context,
  value?: string
): Promise<void | Message | Message[]> => {
  const { msg } = context;

  const replace = replacer(msg);

  if (!value) {
    if (!config.welcomeJson) return Embed.warning('no welcome message set').reply(msg);
    await Embed.info(
      `${msg.guild.name}: current welcome message (\`${config.prefix}config welcomeMessage\` unset to remove)`,
      codeBlock(JSON.stringify(JSON.parse(config.welcomeJson), null, 2), 'json')
    ).reply(msg);

    return msg.channel.send(parseDiscohookJSON(replace(config.welcomeJson)));
  }

  if (value === 'unset') {
    delete config.welcomeJson;
    return Embed.warning('unset welcome message').reply(msg);
  }

  try {
    if (config.welcomeJson) {
      await msg.reply('existing welcome message: ');
      await msg.channel.send(parseDiscohookJSON(replace(config.welcomeJson)));

      const confirmation = await msg.channel.send(
        `${msg.author} replace this welcome message with a new one?`
      );

      const collector = confirmation.createReactionCollector({
        idle: 15000,
        filter: (reaction: MessageReaction, user: User) =>
          ['✅', '❌'].includes(reaction.emoji.name!) && user.id === msg.author?.id,
      });

      collector.on('collect', (reaction, user) => {
        if (reaction.emoji.name === '❌') return msg.channel.send('cancelled');
        collector.stop();
        confirmMessage(value, config, context);
      });

      await confirmation.react('✅');
      confirmation.react('❌');
      return;
    }

    confirmMessage(value, config, context);
  } catch (err) {
    Embed.error(codeBlock(err)).send(msg.channel);
  }
};

const confirmMessage = async (json: string, config: Config, context: Context) => {
  const { msg } = context;

  await msg.channel.send(parseDiscohookJSON(replacer(msg)(json)));
  const confirmation = await msg.reply(`${msg.author} set this as the welcome message?`);

  await confirmation.react('✅');
  confirmation.react('❌');

  const collector = confirmation.createReactionCollector({
    idle: 15000,
    filter: (reaction: MessageReaction, user: User) =>
      ['✅', '❌'].includes(reaction.emoji.name!) && user.id === msg.author?.id,
  });

  collector.on('collect', reaction => {
    if (reaction.emoji.name === '❌') return msg.channel.send('cancelled');

    config.welcomeJson = JSON.stringify(JSON.parse(json));

    if (!config.welcomeChannelId)
      Embed.warning(
        'message set successfully',
        'warning: no welcome channel set, messages will default to system message channel'
      ).reply(msg);
    else Embed.success('new welcome message set').reply(msg);
  });
};
