import { Guild, VoiceChannel, VoiceState } from 'discord.js';
import { client, getLogger } from '../providers';

const cleanQueue = (guild: Guild) => {
  const queue = client.queues.get(guild.id);
  if (!queue) return;
  queue.reset();
};

export const onVoiceStateUpdate = (oldState: VoiceState, newState: VoiceState): void => {
  if (oldState.id === client.user?.id && newState.id === client.user?.id) {
    // that's us!
    if (oldState.channelId != null && newState.channelId == null) {
      // disconnected
      getLogger(`VOICE ${newState.id}`).debug('bot was disconnected in ' + newState.guild.id);
      cleanQueue(newState.guild);
    } else if (oldState.channelId == null && newState.channelId != null) {
      // joined
      // do nothing
    } else if (oldState.channelId != newState.channelId) {
      // moved
      // need to keep track of new channel
      const channel = newState.guild.channels.resolve(newState.channelId!);
      const queue = client.queues.get(newState.guild.id);

      queue.voiceChannel = channel as VoiceChannel;
    }
  } else if (oldState.channelId == oldState.guild.me?.voice.channelId) {
    // if (newState.guild.me?.voice.channel?.members.size === 1) {
    //   // everyone disconnected
    //   const queue = client.queues.get(newState.guild.id);
    //   queue.tracks = [];
    //   cleanQueue(newState.guild);
    // }
  }
};
