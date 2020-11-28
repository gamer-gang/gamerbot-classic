import { Migration } from '@mikro-orm/migrations';

export class Migration20201127195637 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "config" add column "log_subscribed_events" bigint not null default 0, add column "log_channel_id" text null;'
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table "config" drop column "log_subscribed_events";');
    this.addSql('alter table "config" drop column "log_channel_id";');
  }
}
