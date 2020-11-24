import { Migration } from '@mikro-orm/migrations';

export class Migration20201124194411 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "egg_leaderboard" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "user_id" varchar(255) not null, "user_tag" varchar(255) not null, "eggs" int4 not null default 0);');
  }

}
