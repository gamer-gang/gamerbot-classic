import { Migration } from '@mikro-orm/migrations';

export class Migration20201007221929 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "reaction_role" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "guild_id" text not null, "message_id" text not null);');

    this.addSql('create table "role_emoji" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "message_id" int4 not null, "role_id" text not null, "emoji" text not null);');

    this.addSql('create table "config" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "guild_id" text not null, "prefix" text not null default \'$\', "allow_spam" bool not null default false, "egg" bool not null default true);');
    this.addSql('alter table "config" add constraint "config_guild_id_unique" unique ("guild_id");');

    this.addSql('alter table "role_emoji" add constraint "role_emoji_message_id_foreign" foreign key ("message_id") references "reaction_role" ("id") on update cascade;');
  }

}
