import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Config } from '../../../entities/Config';
import { CommandEvent } from '../../../models/CommandEvent';

export const egg = async (
  event: CommandEvent,
  value?: string | boolean
): Promise<void | Message> => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  if (!value) return event.reply(Embed.info(`Egg is ${config.egg ? 'on' : 'off'}`));
  console.log(value);
  switch (value) {
    case 'yes':
    case 'y':
    case 'true':
    case 'on':
    case true:
      config.egg = true;
      break;
    case 'no':
    case 'n':
    case 'false':
    case 'off':
    case false:
      config.egg = false;
      break;
    default:
      return event.reply(
        Embed.error('Value must be one of `yes|y|true|on|no|n|false|off`').ephemeral()
      );
  }

  return event.reply(Embed.success(`Egg ${config.egg ? 'activated' : 'off (but why???)'}`));
};
