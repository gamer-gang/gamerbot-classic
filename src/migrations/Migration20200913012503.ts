import { Migration } from '@mikro-orm/migrations';

export class Migration20200913012503 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "liars_dice" add column "current_bidder" text null;');
  }

}
