import { Message } from 'discord.js';
import { Command, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandPing extends Command {
  cmd = ['ping'];
  docs = [
    {
      usage: 'ping',
      description: 'server to gateway roundtrip time',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Test server ping',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const message = `Pong! ws: \`${client.ws.ping}ms\``;
    await event.reply(message);

    const end = process.hrtime(event.startTime);
    event.editReply(message + `, await: \`${Math.round((end[0] * 1e9 + end[1]) / 1e6)}ms\``);
  }
}
