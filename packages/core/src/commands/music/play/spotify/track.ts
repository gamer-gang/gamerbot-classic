import { Context } from '@gamerbot/types';
import { Embed, normalizeDuration, regExps } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Duration } from 'luxon';
import { SpotifyTrack } from '../../../../models';
import { client } from '../../../../providers';
import { CommandPlay } from '../play';
import { checkSpotify } from '../util';

export const getSpotifyTrack = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;
  const trackId = regExps.spotify.track.exec(args._[0]);
  if (!trackId) return Embed.error('Invalid track').reply(msg);

  if (!checkSpotify(msg)) return;

  const track = await client.spotify.getTrack(trackId[1]);
  if (!track) return Embed.error('Invalid track').reply(msg);

  caller.queueTrack(
    new SpotifyTrack(msg.author.id, {
      title: track.body.name,
      cover: track.body.album.images[0],
      artists: track.body.artists,
      id: track.body.id,
      duration: normalizeDuration(Duration.fromMillis(track.body.duration_ms)),
    }),
    { context }
  );
};
