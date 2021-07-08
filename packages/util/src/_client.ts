import { Gamerbot } from './client';

let client: Gamerbot | undefined = undefined;

export const registerClientUtil = (c: Gamerbot): void => {
  client = c;
};

export const getClient = (): Gamerbot => {
  if (client) return client;

  throw new Error('client requested before initialized');
};
