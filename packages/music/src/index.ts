import { generateDependencyReport } from '@discordjs/voice';
import { resolvePath } from '@gamerbot/util';
import dotenv from 'dotenv';
import { getLogger } from 'log4js';
import { client } from './providers';

dotenv.config({ path: resolvePath('.env') });

client.on('messageCreate', async msg => {
  if (msg.content === '$$musicdebug') msg.reply(generateDependencyReport());
});

const debugLogger = getLogger('Client!debug');
client.on('debug', content => {
  if (content.includes('Heartbeat')) return;

  debugLogger.debug(content);

  if (content.includes('Remaining: '))
    getLogger('Client+info').info(`Remaining gateway sessions: ${content.split(' ').reverse()[0]}`);
});

client.on('ready', () => {
  getLogger('Client!ready').info(`${client.user.tag} ready`);
});

client.login(process.env.DISCORD_TOKEN);
