import { Migration } from '@mikro-orm/migrations';

export class Migration20201008011358 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "config" add column "egg" bool not null default true;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "config" drop column "egg";');
  }
}
