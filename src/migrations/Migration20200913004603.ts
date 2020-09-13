import { Migration } from '@mikro-orm/migrations';

export class Migration20200913004603 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "liars_dice" add column "round_number" int4 not null default 0;');
  }

}
