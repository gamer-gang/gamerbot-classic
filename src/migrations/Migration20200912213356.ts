import { Migration } from '@mikro-orm/migrations';

export class Migration20200912213356 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "liars_dice" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "guild_id" text not null, "game_code" text not null, "creator_id" text not null, "dice_sides" int4 not null default 6, "dice_amount" int4 not null default 5, "player_order" jsonb not null);');

    this.addSql('create table "liars_dice_player" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "player_id" text not null, "game_id" int4 not null, "hand" text[] not null);');

    this.addSql('alter table "liars_dice_player" add constraint "liars_dice_player_game_id_foreign" foreign key ("game_id") references "liars_dice" ("id") on update cascade;');
  }

}
