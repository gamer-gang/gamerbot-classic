import { Message, MessageReaction, User } from 'discord.js';
import { Config } from '../../../entities/Config';
import { Context } from '../../../types';
import { codeBlock, Embed, parseDiscohookJSON } from '../../../util';

const replacer = (msg: Context['msg']) => (json: string) =>
  json
    .replace(/%USER%/g, `<@!${msg.author.id}>`)
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
    if (!config.welcomeJson) return msg.channel.send(Embed.warning('no welcome message set'));
    await msg.channel.send(
      Embed.info(
        `${msg.guild.name}: current welcome message (\`${config.prefix}config welcomeMessage\` unset to remove)`,
        codeBlock(JSON.stringify(JSON.parse(config.welcomeJson), null, 2), 'json')
      )
    );

    return msg.channel.send(parseDiscohookJSON(replace(config.welcomeJson)));
  }

  if (value === 'unset') {
    delete config.welcomeJson;
    return msg.channel.send(Embed.warning('unset welcome message'));
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
        confirmMessage(value, config, context);
      });

      await confirmation.react('✅');
      confirmation.react('❌');
      return;
    }

    confirmMessage(value, config, context);
  } catch (err) {
    msg.channel.send(Embed.error(codeBlock(err)));
  }
};

const confirmMessage = async (json: string, config: Config, context: Context) => {
  const { msg } = context;

  await msg.channel.send(parseDiscohookJSON(replacer(msg)(json)));
  const confirmation = await msg.channel.send('set this as the welcome message?');

  await confirmation.react('✅');
  confirmation.react('❌');

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
        Embed.warning(
          'message set successfully',
          'warning: no welcome channel set, messages will default to system message channel'
        )
      );
    else msg.channel.send(Embed.success('new welcome message set'));
  });
};
