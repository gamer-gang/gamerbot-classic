import { Client, ClientOptions, ClientUser } from 'discord.js';

export class GamerbotMusic extends Client {
  readonly user!: ClientUser;
  readonly devMode = process.env.NODE_ENV === 'development';

  constructor(
    opts: Omit<ClientOptions, 'partials'> = {
      intents: [
        'GUILDS',
        'GUILD_MEMBERS',
        'GUILD_BANS',
        'GUILD_EMOJIS',
        'GUILD_INVITES',
        'GUILD_VOICE_STATES',
        'GUILD_MESSAGES',
        'GUILD_MESSAGE_REACTIONS',
        'GUILD_MESSAGE_TYPING',
      ],
    }
  ) {
    super(opts);
  }
}
