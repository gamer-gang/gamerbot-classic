import { Migration } from '@mikro-orm/migrations';

export class Migration20200916145526 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "reaction_role" drop column "role_id";');
    this.addSql('alter table "reaction_role" drop column "emoji";');

    this.addSql('create table "role_emoji" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "message_id" int4 not null, "role_id" text not null, "emoji" text not null);');

    this.addSql('alter table "role_emoji" add constraint "role_emoji_message_id_foreign" foreign key ("message_id") references "reaction_role" ("id") on update cascade;');
  }

}
