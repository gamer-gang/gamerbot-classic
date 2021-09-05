import amqplib from 'amqplib';
import { getLogger } from 'log4js';

export const assertAmqp = (): void => {
  if (!process.env.AMQP_URL) throw new Error('Expected environment variable AMQP_URL');
  amqp ??= connect();
};

const connect = async () => {
  let connection;
  while (!connection) {
    try {
      const tempConnection = await amqplib.connect(process.env.AMQP_URL!);
      connection = tempConnection;
    } catch (err) {
      getLogger('amqpConnect').info('connection refused, retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return connection;
};

export let amqp: Promise<amqplib.Connection>;
export const c2m = 'c2m-music';
export const m2c = 'm2c-music';
