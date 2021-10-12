import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Config } from '../../entities/Config';
import { CommandEvent } from '../../models/CommandEvent';

export const allowSpam = async (
  event: CommandEvent,
  newValue?: string | boolean
): Promise<void | Message> => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  if (!newValue)
    return event.reply(Embed.info(`Spam commands are **${config.allowSpam ? 'on' : 'off'}**`));

  switch (newValue) {
    case 'yes':
    case 'y':
    case 'true':
    case 'on':
    case true:
      config.allowSpam = true;
      break;
    case 'no':
    case 'n':
    case 'false':
    case 'off':
    case false:
      config.allowSpam = false;
      break;
    default:
      return event.reply(
        Embed.error('Bad value', 'Value must be one of `yes|y|true|on|no|n|false|off`').ephemeral()
      );
  }

  await event.reply(Embed.success(`Spam commands are now **${config.allowSpam ? 'on' : 'off'}**`));
};
