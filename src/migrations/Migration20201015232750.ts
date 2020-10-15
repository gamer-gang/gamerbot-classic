import { Migration } from '@mikro-orm/migrations';

export class Migration20201015232750 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "config" add column "welcome_json" text null, add column "welcome_channel_id" text null;');
  }

}
