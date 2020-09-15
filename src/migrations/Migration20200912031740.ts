import { Migration } from '@mikro-orm/migrations';

export class Migration20200912031740 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "reaction_role" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "guild_id" text not null, "role_id" text not null, "message_id" text not null, "emoji" text not null);');

    this.addSql('create table "config" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "guild_id" text not null, "prefix" text not null default \'$\', "allow_spam" bool not null default false);');
    this.addSql('alter table "config" add constraint "config_guild_id_unique" unique ("guild_id");');
  }

}
