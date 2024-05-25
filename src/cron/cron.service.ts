import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()

export class CronService {

  // Id généré aléatoirement
  cronNames = {
    emails: 5944578563374335,
  };

  constructor(private dataSource: DataSource) {
    for (const [key, value] of Object.entries(this.cronNames)) {
      this.dataSource.query(`SELECT pg_advisory_unlock(${this.cronNames[key]})`).then();
    }
  }

  async askForLock(name: string): Promise<boolean> {
    const id = this.cronNames[name];
    const result = await this.dataSource.query(`SELECT pg_try_advisory_lock(${id}) AS "should_run"`);
    return result[0].should_run;
  }

  async unlock(name: string) {
    const id = this.cronNames[name];
    await this.dataSource.query(`SELECT pg_advisory_unlock(${id})`);
  }

}