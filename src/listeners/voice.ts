import { VoiceState } from 'discord.js';

import { client, getLogger } from '../providers';
import { updatePlayingEmbed } from '../util';

export const onVoiceStateUpdate = () => (oldState: VoiceState, newState: VoiceState): void => {
  if (oldState.id === client.user?.id && newState.id === client.user?.id) {
    // that's us!
    if (oldState.channelID != null && newState.channelID == null) {
      // disconnected
      getLogger(`VOICE ${newState.id}`).info('bot was disconnected in ' + newState.guild.id);
      const queue = client.queues.get(newState.guild.id);
      if (!queue) return;
      updatePlayingEmbed({ guildId: newState.guild.id, playing: false });
      queue.tracks = [];
      queue.playing = false;
      client.queues.set(newState.guild.id, {
        tracks: [],
        playing: false,
        current: {},
        paused: false,
      });
      queue.voiceConnection?.dispatcher?.end('disconnected');
    } else if (oldState.channelID == null && newState.channelID != null) {
      // joined
      // do nothing
    } else if (oldState.channelID != newState.channelID) {
      // moved
      // do nothing i think
    }
  }
};
