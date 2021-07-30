import { Migration } from '@mikro-orm/migrations';

export class Migration20210730192608 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "egg_leaderboard" drop constraint if exists "egg_leaderboard_collected_check";'
    );
    this.addSql(
      'alter table "egg_leaderboard" alter column "collected" type bigint using ("collected"::bigint);'
    );
    this.addSql(
      'alter table "egg_leaderboard" drop constraint if exists "egg_leaderboard_balance_check";'
    );
    this.addSql(
      'alter table "egg_leaderboard" alter column "balance" type bigint using ("balance"::bigint);'
    );
    this.addSql('update "egg_leaderboard" set "balance" = "collected";');
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table "egg_leaderboard" drop constraint if exists "egg_leaderboard_collected_check";'
    );
    this.addSql(
      'alter table "egg_leaderboard" alter column "collected" type int4 using ("collected"::int4);'
    );
    this.addSql(
      'alter table "egg_leaderboard" drop constraint if exists "egg_leaderboard_balance_check";'
    );
    this.addSql(
      'alter table "egg_leaderboard" alter column "balance" type int4 using ("balance"::int4);'
    );
  }
}
