import axios from 'axios';
import { Player, PlayerResponse } from 'hypixel-types';
import { insertUuidDashes } from '../../../util';

const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

class UuidCache extends Map<string, string> {
  has(username: string): boolean {
    return super.has(username.toLowerCase());
  }

  get(username: string, dashed = false): string | undefined {
    const plainUuid = super.get(username.toLowerCase());
    return dashed ? plainUuid && insertUuidDashes(plainUuid) : plainUuid;
  }

  set(username: string, uuid: string): this {
    if (!uuidRegex.test(uuid)) throw new Error(`Invalid UUID "${uuid}" for "${username}"`);
    super.set(username.toLowerCase(), uuid.replace(/-/g, ''));
    return this;
  }

  delete(username: string): boolean {
    return super.delete(username.toLowerCase());
  }
}

class StatsProvider {
  map = new Map<string, Player>();
  uuidCache = new UuidCache();

  async get(identifier: string): Promise<Player | undefined> {
    const isUuid = uuidRegex.test(identifier);

    const potentialUuid = isUuid ? identifier.replace(/-/g, '') : this.uuidCache.get(identifier);

    if (!this.map.has(potentialUuid ?? '')) {
      const response = await axios.get('https://api.hypixel.net/player', {
        params: {
          key: process.env.HYPIXEL_API_KEY,
          uuid: isUuid ? encodeURIComponent(identifier) : undefined,
          name: isUuid ? undefined : encodeURIComponent(identifier),
        },
        validateStatus: () => true,
      });

      const data = response.data as PlayerResponse;

      if (response.status !== 200 || !data.success)
        throw new Error(`% API request failed: ${response.status} ${response.statusText}`);

      if (!data.player) throw new Error('% Player does not exist');

      this.map.set(data.player.uuid, data.player);
      setTimeout(() => this.map.delete(data.player!.uuid!), 1000 * 60 * 5);

      this.uuidCache.set(data.player.playername, data.player.uuid);
      setTimeout(() => this.uuidCache.delete(data.player!.playername), 1000 * 60 * 15);
    }

    return this.map.get(isUuid ? identifier.replace(/-/g, '') : this.uuidCache.get(identifier)!);
  }
}

export const statsProvider = new StatsProvider();
