import { VoiceState } from 'discord.js';

import { client, queueStore } from '..';

export const onVoiceStateUpdate = () => (oldState: VoiceState, newState: VoiceState): void => {
  if (oldState.id === client.user?.id && newState.id === client.user?.id) {
    // that's us!
    if (oldState.channelID != null && newState.channelID == null) {
      // disconnected
      console.log('bot was disconnected');
      const queue = queueStore.get(newState.guild.id);
      if (!queue) return;
      delete queue.voiceChannel;
      delete queue.voiceConnection;
      delete queue.textChannel;
      delete queue.current.embed;
      queue.tracks = [];
      queue.playing = false;
    } else if (oldState.channelID == null && newState.channelID != null) {
      // joined
      // do nothing
    } else if (oldState.channelID != newState.channelID) {
      // moved
      // do nothing i think
    }
  }
};
