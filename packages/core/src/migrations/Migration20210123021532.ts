import { Migration } from '@mikro-orm/migrations';

export class Migration20210123021532 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "hypixel_player" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "user_id" varchar(255) not null, "hypixel_username" varchar(255) not null);'
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table "hypixel_player";');
  }
}
