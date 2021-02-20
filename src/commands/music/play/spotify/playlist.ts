import { Message } from 'discord.js';
import moment from 'moment';
import { client } from '../../../../providers';
import { Context, SpotifyTrack } from '../../../../types';
import { Embed, regExps } from '../../../../util';
import { CommandPlay } from '../play';
import { checkSpotify } from '../util';

export const getSpotifyPlaylist = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;
  const playlistId = regExps.spotify.playlist.exec(args._[0]);
  if (!playlistId) return msg.channel.send(Embed.error('Invalid playlist'));

  if (!checkSpotify(msg)) return;

  const playlist = await client.spotify.getPlaylist(playlistId[1]);
  if (!playlist) return msg.channel.send(Embed.error('Invalid playlist'));

  for (const {
    track: { name, artists, duration_ms, id, album },
  } of playlist.body.tracks.items) {
    caller.queueTrack(
      new SpotifyTrack(msg.author.id, {
        title: name,
        cover: album.images[0],
        artists,
        duration: moment.duration(duration_ms, 'ms'),
        id,
      }),
      { context, silent: true, beginPlaying: false }
    );
  }

  const queue = client.queues.get(msg.guild.id);
  queue.updateNowPlaying();

  msg.channel.send(
    Embed.success(
      `Queued ${playlist.body.tracks.items.length} tracks from ` +
        `**[${playlist.body.name}](https://open.spotify.com/playlist/${playlist.body.id})**`,
      queue.paused ? 'music is paused btw' : undefined
    )
  );

  if (!queue.playing) caller.playNext(context);
};
