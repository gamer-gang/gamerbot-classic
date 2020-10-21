import { VoiceState } from 'discord.js';

import { client, getLogger, LoggerType, queueStore } from '../providers';
import { updatePlayingEmbed } from '../util';

export const onVoiceStateUpdate = () => (oldState: VoiceState, newState: VoiceState): void => {
  if (oldState.id === client.user?.id && newState.id === client.user?.id) {
    // that's us!
    if (oldState.channelID != null && newState.channelID == null) {
      // disconnected
      getLogger(LoggerType.VOICE, newState.id).info('bot was disconnected in ' + newState.guild.id);
      const queue = queueStore.get(newState.guild.id);
      if (!queue) return;
      updatePlayingEmbed({ playing: false });
      queue.voiceConnection?.dispatcher?.end('disconnected', () => {
        delete queue.voiceChannel;
        delete queue.voiceConnection;
        delete queue.textChannel;
        delete queue.current.embed;
        delete queue.current.embedInterval;
        queue.tracks = [];
        queue.playing = false;
      });
    } else if (oldState.channelID == null && newState.channelID != null) {
      // joined
      // do nothing
    } else if (oldState.channelID != newState.channelID) {
      // moved
      // do nothing i think
    }
  }
};
