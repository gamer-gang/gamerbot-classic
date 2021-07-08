import { Context } from '@gamerbot/types';
import { Embed, normalizeDuration, regExps } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { Duration } from 'luxon';
import { SpotifyTrack } from '../../../../models';
import { client } from '../../../../providers';
import { CommandPlay } from '../play';
import { checkSpotify } from '../util';

export const getSpotifyAlbum = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;
  const albumId = regExps.spotify.album.exec(args._[0]);
  if (!albumId) return Embed.error('Invalid album').reply(msg);

  if (!checkSpotify(msg)) return;

  const album = await client.spotify.getAlbum(albumId[1]);
  if (!album) return Embed.error('Invalid album').reply(msg);

  let tracks = album.body.tracks.items;

  switch (args.sort) {
    case 'newest':
    case 'oldest':
    case 'views':
      Embed.warning(
        'Sorting by date or popularity is not supported for Spotify albums',
        'Using original album order'
      ).reply(msg);
      break;
    case 'random':
      tracks = _.shuffle(tracks);
      break;
  }

  for (const { name, artists, duration_ms, id } of tracks) {
    caller.queueTrack(
      new SpotifyTrack(msg.author.id, {
        title: name,
        cover: album.body.images[0],
        artists,
        duration: normalizeDuration(Duration.fromMillis(duration_ms)),
        id,
      }),
      { context, silent: true, beginPlaying: false }
    );
  }

  const queue = client.queues.get(msg.guild.id);

  Embed.success(
    `Queued ${album.body.tracks.items.length} tracks from ` +
      `**[${album.body.name}](https://open.spotify.com/album/${album.body.id})**`,
    queue.paused ? 'music is paused btw' : undefined
  ).reply(msg);

  if (!queue.playing) caller.playNext(context);
};
