import { Guild, VoiceState } from 'discord.js';
import { client, getLogger } from '../providers';
import { updatePlayingEmbed } from '../util';

const cleanQueue = (guild: Guild) => {
  const queue = client.queues.get(guild.id);
  if (!queue) return;
  updatePlayingEmbed({ guildId: guild.id, playing: false });
  queue.playing = false;
  queue.voiceConnection?.dispatcher?.end('disconnected');
};

export const onVoiceStateUpdate = () => (oldState: VoiceState, newState: VoiceState): void => {
  if (oldState.id === client.user?.id && newState.id === client.user?.id) {
    // that's us!
    if (oldState.channelID != null && newState.channelID == null) {
      // disconnected
      getLogger(`VOICE ${newState.id}`).info('bot was disconnected in ' + newState.guild.id);
      cleanQueue(newState.guild);
    } else if (oldState.channelID == null && newState.channelID != null) {
      // joined
      // do nothing
    } else if (oldState.channelID != newState.channelID) {
      // moved
      // do nothing i think
    }
  } else if (oldState.channelID == oldState.guild.me?.voice.channelID) {
    if (newState.guild.me?.voice.channel?.members.size === 1) {
      // everyone disconnected
      const queue = client.queues.get(newState.guild.id);
      queue.tracks = [];
      cleanQueue(newState.guild);
    }
  }
};
