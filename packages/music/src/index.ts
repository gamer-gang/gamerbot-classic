import { generateDependencyReport } from '@discordjs/voice';
import { resolvePath } from '@gamerbot/util';
import dotenv from 'dotenv';
import { getLogger } from 'log4js';
import { client } from './providers';

dotenv.config({ path: resolvePath('.env') });

client.on('messageCreate', async msg => {
  if (msg.content === '$$musicdebug') {
    msg.reply(generateDependencyReport());
  }
});

if (client.devMode) {
  const logger = getLogger('Client!debug');
  client.on('debug', content => {
    logger.debug(content);
  });
} else {
  client.on('debug', content => {
    if (content.includes('Remaining: ')) {
      getLogger('Client').info(`Remaining gateway sessions: ${content.split(' ').reverse()[0]}`);
    }
  });
}

client.on('ready', () => {
  getLogger('Client!ready').info(`${client.user.tag} ready`);
});

// client.login();
