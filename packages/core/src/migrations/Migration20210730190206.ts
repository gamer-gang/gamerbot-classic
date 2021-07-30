import { Migration } from '@mikro-orm/migrations';

export class Migration20210730190206 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "egg_leaderboard" rename column "eggs" to "collected";');

    this.addSql('alter table "egg_leaderboard" add column "balance" int4 not null default 0;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "egg_leaderboard" rename column "collected" to "eggs";');

    this.addSql('alter table "egg_leaderboard" deop column "balance"');
  }
}
