import { Message } from 'discord.js';
import moment from 'moment';
import { client } from '../../../providers';
import { Embed } from '../../../util';

export const checkSpotify = (msg: Message): boolean => {
  if (client.spotifyDisabled) {
    msg.channel.send(
      Embed.error('Spotify support disabled', 'No credentials provided in environment')
    );
    return false;
  }

  if (!client.spotify.getAccessToken()) {
    msg.channel.send(
      Embed.error(
        'Cannot connect to spotify',
        `Please try again in ${moment
          .duration(client.spotifyTimeoutSeconds, 'seconds')
          .humanize(true)}`
      )
    );

    return false;
  }

  return true;
};
