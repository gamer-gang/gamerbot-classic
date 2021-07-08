import { Client, PresenceData } from 'discord.js';

export class PresenceManager {
  static cooldown = 5000;

  private _presence: PresenceData = {};
  private _needsUpdate = false;
  private _destroyed = false;
  queueWorker: NodeJS.Timeout;

  constructor(client: Client) {
    this.queueWorker = setInterval(() => {
      if (this._needsUpdate) {
        client.user?.setPresence(this.presence);
        this._needsUpdate = false;
      }
    }, 5000);
  }

  destroy(): void {
    this._destroyed = true;
    clearInterval(this.queueWorker);
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  get needsUpdate(): boolean {
    return this._needsUpdate;
  }

  get presence(): PresenceData {
    return this._presence;
  }

  set presence(data: PresenceData) {
    this._presence = data;
    this._needsUpdate = true;
  }
}
