import { Message } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '../..';
import { APIMessage, CommandEvent } from '../../../models/CommandEvent';
import { CommandPlay } from './CommandPlay';

export class CommandPlayNext extends ChatCommand {
  name = ['playnext'];
  help: CommandDocs = [
    {
      usage: ['play <query>'],
      description: 'play from a video/playlist/channel/album url, or search for a video',
    },
  ];
  data: CommandOptions = {
    description: 'Like /play but plays next',
    options: [
      {
        name: 'query',
        description: 'URL or search query',
        type: 'STRING',
        required: true,
      },
    ],
  };

  execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    return new CommandPlay().execute(event, true);
  }
}
