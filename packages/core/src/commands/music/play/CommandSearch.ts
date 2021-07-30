import { Embed } from '@gamerbot/util';
import { Message, TextChannel } from 'discord.js';
import { Command, CommandOptions } from '../..';
import { APIMessage, CommandEvent } from '../../../models/CommandEvent';
import { Track } from '../../../models/Track';
import { client } from '../../../providers';
import { getYoutubeSearch } from './getYoutubeSearch';

export class CommandSearch extends Command {
  cmd = ['search'];
  docs = [{ usage: 'search <...query>', description: 'search yt for video' }];
  commandOptions: CommandOptions = {
    description: 'Search Youtube for a video to play',
    options: [
      {
        name: 'query',
        description: 'Search query',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel)
      return event.reply(Embed.error('You are not in a voice channel').ephemeral());
    if (event.guild.me?.voice.channelId && event.guild.me.voice.channelId !== voice.channelId)
      return event.reply(
        Embed.error(
          'You must be in the same voice channel as the bot to use this command'
        ).ephemeral()
      );

    const queue = client.queues.get(event.guild.id);

    const permissions = voice.channel.permissionsFor(client.user.id);
    if (!permissions?.has('CONNECT'))
      return event.reply(Embed.error("Can't connect to that voice channel").ephemeral());
    if (!permissions?.has('SPEAK'))
      return event.reply(Embed.error("Can't speak in that voice channel").ephemeral());

    const query = (event.isInteraction() ? event.options.getString('query') : event.args)?.trim();

    if (!query)
      return event.reply(
        Embed.error(
          'Expected a URL or query',
          event.isMessage() && event.message.attachments.size
            ? `Tip: use ${event.guildConfig.prefix}playfile or /playfile to play an audio file`
            : ''
        ).ephemeral()
      );

    // if (args.sort !== undefined) {
    //   const sort = args.sort.toLowerCase();
    //   const normalizedSort = Object.keys(sortAliases).find(k =>
    //     sortAliases[k].find(keyword => sort === keyword || keyword.includes(sort))
    //   );

    //   if (!normalizedSort)
    //     return Embed.error('Invalid sort type (valid: newest, oldest, views, random)').reply(msg);

    //   args.sort = normalizedSort;
    // }

    // if (queue.paused) {
    //   queue.audioPlayer.unpause();
    //   queue.updateNowPlaying();
    //   msg.react('▶️');
    //   return;
    // }

    // if (!queue.playing && queue.tracks.length) {
    //   queue.index = 0;
    //   return this.playNext(context);
    // }

    queue.textChannel = event.channel as TextChannel;

    await event.defer();

    let tracks: Track[] = [];

    try {
      tracks = await getYoutubeSearch({ query, event, ask: true });
    } catch (err) {
      if (err.message.startsWith('% '))
        return event.editReply(Embed.error(err.message.slice(2)).ephemeral());
      else throw err;
    }

    queue.voiceChannel = event.guild.members.resolve(event.user.id)!.voice.channel!;
    const position = (await queue.queueTracks(tracks, event.user.id)) + 1;

    event.editReply({
      embeds: [
        Embed.success(
          tracks.length === 1
            ? `Queued **${tracks[0].titleMarkup}** (#${position} in queue)`
            : `Queued ${tracks.length.toString()} tracks (starting at #${position} in queue)`
        ),
      ],
      components: [],
    });
  }
}
