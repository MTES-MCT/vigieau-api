import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VigieauLogger } from '../logger/vigieau.logger';

@Injectable()
export class CronService {
  private readonly logger = new VigieauLogger('CronService');

  // Identifiants de lock définis pour chaque cron
  private readonly cronNames: Record<string, number> = {
    emails: 5944578563374335,
  };

  constructor(private dataSource: DataSource) {
    // Libère tous les locks au démarrage
    this.freeLocks();
  }

  /**
   * Libère tous les locks définis dans `cronNames` au démarrage.
   */
  private async freeLocks(): Promise<void> {
    this.logger.log('LIBERATION DES LOCKS CRON - BEGIN');

    try {
      // Utilisation de `Promise.all` pour attendre toutes les requêtes asynchrones
      await Promise.all(
        Object.values(this.cronNames).map((id) =>
          this.dataSource.query(`SELECT pg_advisory_unlock(${id})`),
        ),
      );
      this.logger.log('LIBERATION DES LOCKS CRON - END');
    } catch (error) {
      this.logger.error('Erreur lors de la libération des locks.', error);
    }
  }

  /**
   * Tente d'acquérir un lock pour le cron spécifié.
   *
   * @param name - Le nom du cron (ex: 'emails').
   * @returns `true` si le lock a été acquis avec succès, `false` sinon.
   */
  async askForLock(name: string): Promise<boolean> {
    const id = this.cronNames[name];

    // Valide que le nom du cron existe
    if (!id) {
      this.logger.error(`Le nom du cron "${name}" n'existe pas dans cronNames.`, '');
      return false;
    }

    const result = await this.dataSource.query(`SELECT pg_try_advisory_lock(${id}) AS "should_run"`);
    return result[0].should_run;
  }

  /**
   * Libère le lock pour le cron spécifié.
   *
   * @param name - Le nom du cron (ex: 'emails').
   */
  async unlock(name: string) {
    const id = this.cronNames[name];

    // Valide que le nom du cron existe
    if (!id) {
      this.logger.error(`Le nom du cron "${name}" n'existe pas dans cronNames.`, '');
      return false;
    }

    await this.dataSource.query(`SELECT pg_advisory_unlock(${id})`);
  }

}