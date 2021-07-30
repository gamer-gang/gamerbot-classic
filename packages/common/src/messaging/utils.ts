const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const makeMessage = (
  command: string,
  guildId: bigint | string,
  ...args: string[]
): [id: bigint, buffer: Buffer] => {
  const restEncoded = args
    .map(encoder.encode.bind(encoder))
    .reduce((arr, curr) => [...arr, ...curr, 0], [] as number[])
    .slice(0, -1);

  const buffer = Buffer.from([
    ...Array(8).fill(0),
    ...Array(8).fill(0),
    ...encoder.encode(command),
    0,
    ...restEncoded,
  ]);

  const id = generateId();
  buffer.writeBigUInt64LE(id, 0);
  buffer.writeBigUInt64LE(typeof guildId === 'string' ? BigInt(guildId) : guildId, 8);

  return [id, buffer];
};

const splitBuffer = (buffer: Buffer): number[][] => {
  const parts: number[][] = [];
  let part: number[] = [];
  for (const byte of buffer) {
    if (byte === 0) {
      parts.push(part);
      part = [];
    } else {
      part.push(byte);
    }
  }
  part.length && parts.push(part);

  return parts;
};

export const parseMessage = (
  buffer: Buffer
): [id: bigint, guildId: bigint, command: string, ...args: string[]] => {
  const id = buffer.readBigUInt64LE(0);
  const guildId = buffer.readBigUInt64LE(8);
  const rest = buffer.slice(16);

  const parts = splitBuffer(rest).map(bytes => decoder.decode(new Uint8Array(bytes)));
  if (!parts.length) throw new Error('Invalid message: no command/args in buffer');

  return [id, guildId, parts.shift()!, ...parts];
};

let idCounter = 0;
export const generateId = (): bigint => {
  // 0 for core, 1 for music
  const worker = 0b00000;
  const process = 0b00000;

  const timestamp = Date.now() - 1612166400000; // 2021-1-1 00:00

  idCounter = (idCounter + 1) % 4096;

  const bin =
    '0b' +
    timestamp.toString(2).padStart(42, '0') +
    worker.toString(2).padStart(5, '0') +
    process.toString(2).padStart(5, '0') +
    idCounter.toString(2).padStart(12, '0');

  return BigInt(bin);
};
