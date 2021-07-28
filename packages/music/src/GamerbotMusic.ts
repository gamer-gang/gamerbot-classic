import { Client, ClientOptions, ClientUser } from 'discord.js';

export class GamerbotMusic extends Client {
  readonly user!: ClientUser;
  readonly devMode = process.env.NODE_ENV === 'development';

  constructor(
    opts: Omit<ClientOptions, 'partials'> = {
      intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES'],
    }
  ) {
    super(opts);
  }
}
