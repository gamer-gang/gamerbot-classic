import { Embed, normalizeDuration } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { Duration } from 'luxon';
import miniget from 'miniget';
import * as mm from 'music-metadata';
import { ChatCommand, CommandOptions } from '../..';
import { CommandEvent } from '../../../models/CommandEvent';
import { FileTrack } from '../../../models/FileTrack';
import { client } from '../../../providers';

export class CommandPlayFile extends ChatCommand {
  name = ['playfile'];
  help = [{ usage: 'playfile', description: 'play an audio file' }];
  data: CommandOptions = {
    description: 'Play an audio file',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    if (event.isMessage() && event.message.attachments.size) {
      return this.#queue(event, event.message);
    } else {
      event.reply(
        Embed.info('Send a message with the audio file attached', 'Waiting for message...')
      );

      const collector = event.channel.createMessageCollector({
        idle: 1000 * 60 * 5,
        filter: msg => msg.author.id === event.user.id,
      });

      collector.on('collect', msg => {
        if (msg.attachments.size) collector.stop('file');
        else
          Embed.error('No files attached', 'Attach a file to your message and try again').reply(
            msg
          );
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'file') {
          const msg = (collected as any).last()!;
          return this.#queue(event, msg);
        } else {
          event.followUp(Embed.error('No response in 5 minutes, cancelling'));
        }
      });
    }
  }

  async #queue(event: CommandEvent, message: Message): Promise<void> {
    const attachment = message.attachments.first()!;
    const metadata = await mm.parseStream(miniget(attachment.url));

    const queue = client.queues.get(event.guild.id);

    queue.queueTracks(
      [
        new FileTrack({
          title: (attachment.name || _.last(attachment.url.split('/'))) ?? 'Unknown',
          url: attachment.url,
          duration: normalizeDuration(Duration.fromObject({ seconds: metadata.format.duration })),
        }),
      ],
      event.user.id
    );
  }
}
