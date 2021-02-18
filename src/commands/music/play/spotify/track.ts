import { Message } from 'discord.js';
import { client } from '../../../../providers';
import { Context, SpotifyTrack } from '../../../../types';
import { Embed, regExps, toDuration } from '../../../../util';
import { CommandPlay } from '../play';
import { checkSpotify } from '../util';

export const getSpotifyTrack = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;
  const trackId = regExps.spotify.track.exec(args._[0]);
  if (!trackId) return msg.channel.send(Embed.error('Invalid track'));

  if (!checkSpotify(msg)) return;

  const track = await client.spotify.getTrack(trackId[1]);
  if (!track) return msg.channel.send(Embed.error('Invalid track'));

  caller.queueTrack(
    new SpotifyTrack(msg.author.id, {
      title: track.body.name,
      cover: track.body.album.images[0],
      artists: track.body.artists,
      id: track.body.id,
      duration: toDuration(track.body.duration_ms, 'ms'),
    }),
    { context }
  );
};
