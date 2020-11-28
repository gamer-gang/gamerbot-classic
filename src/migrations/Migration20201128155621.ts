import { Migration } from '@mikro-orm/migrations';

export class Migration20201128155621 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "guild_invite" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "guild_id" text not null, "code" text not null, "creator_id" text null, "creator_tag" text null, "uses" int4 not null default 0);'
    );
    this.addSql(
      'alter table "guild_invite" add constraint "guild_invite_code_unique" unique ("code");'
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table "guild_invite";');
  }
}
