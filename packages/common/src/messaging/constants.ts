import { delay } from '@gamerbot/util';
import amqplib from 'amqplib';

export const assertAmqp = (): void => {
  if (!process.env.AMQP_URL) throw new Error('Expected environment variable AMQP_URL');
  amqp ??= connect();
};

const connect = async () => {
  let connection;
  while (!connection) {
    try {
      connection = amqplib.connect(process.env.AMQP_URL!);
    } catch (err) {
      await delay(1000)(0);
    }
  }
  return connection;
};

export let amqp: Promise<amqplib.Connection>;
export const c2m = 'c2m-music';
export const m2c = 'm2c-music';
