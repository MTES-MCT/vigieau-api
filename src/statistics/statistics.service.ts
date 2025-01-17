import { forwardRef, Inject, Injectable } from '@nestjs/common';
import process from 'node:process';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DepartementsService } from '../departements/departements.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Statistic } from './entities/statistic.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VigieauLogger } from '../logger/vigieau.logger';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StatisticsService {
  private readonly logger = new VigieauLogger('StatisticsService');

  private statistics: any = null;
  private readonly releaseDate: string = '2023-07-11';

  constructor(@InjectRepository(Statistic)
              private readonly statisticRepository: Repository<Statistic>,
              private readonly httpService: HttpService,
              private readonly departementsService: DepartementsService,
              @Inject(forwardRef(() => SubscriptionsService))
              private readonly subscriptionsService: SubscriptionsService,
              private readonly configService: ConfigService) {
  }

  /**
   * Renvoie les statistiques stockées en mémoire.
   *
   * @returns {any} Les statistiques agrégées.
   */
  findAll() {
    return this.statistics;
  }

  /**
   * Charge les statistiques depuis la base de données pour les 30 derniers jours.
   * Les données sont ensuite agrégées pour calculer les totaux.
   */
  async loadStatistics(): Promise<void> {
    const statistics = await this.statisticRepository.find({
      where: {
        date: MoreThanOrEqual(this.releaseDate),
      },
      order: {
        date: 'ASC',
      },
    });

    this.statistics = this.aggregateStatistics(statistics.slice(-30));
  }

  /**
   * Agrège les statistiques pour calculer les totaux par profil, département et région.
   *
   * @param statistics - Liste des statistiques à agréger.
   * @returns Les statistiques agrégées.
   */
  private aggregateStatistics(statistics: Statistic[]): any {
    const aggregated = {
      subscriptions: 0,
      profileRepartition: {},
      departementRepartition: {},
      regionRepartition: {},
      statsByDay: [],
    };

    for (const stat of statistics) {
      this.incrementRepartition(aggregated.profileRepartition, stat.profileRepartition);
      this.incrementRepartition(aggregated.departementRepartition, stat.departementRepartition);
      this.incrementRepartition(aggregated.regionRepartition, stat.regionRepartition);
    }

    aggregated.subscriptions = statistics.reduce((acc, s) => acc + s.subscriptions, 0);

    aggregated.statsByDay = statistics.map(s => ({
      date: s.date,
      visits: s.visits,
      arreteDownloads: s.arreteDownloads,
      restrictionsSearch: s.restrictionsSearch,
    }));

    return aggregated;
  }

  /**
   * Incrémente les valeurs d'une répartition avec celles d'une source.
   *
   * @param target - Répartition cible à incrémenter.
   * @param source - Répartition source contenant les valeurs à ajouter.
   */
  private incrementRepartition(target: Record<string, number>, source: Record<string, number>): void {
    for (const [key, value] of Object.entries(source || {})) {
      target[key] = (target[key] || 0) + value;
    }
  }

  /**
   * Tâche cron exécutée toutes les 3 heures pour calculer les statistiques
   * à partir des données collectées via les API Matomo.
   */
  @Cron(CronExpression.EVERY_3_HOURS)
  async computeStatistics(): Promise<void> {
    this.logger.log('COMPUTE STATISTICS');
    const matomoUrl = `${this.configService.get('MATOMO_URL')}/?module=API&token_auth=${this.configService.get('MATOMO_API_KEY')}&format=JSON&idSite=${this.configService.get('MATOMO_ID_SITE')}&period=day`;
    const oldMatomoUrl = `${this.configService.get('OLD_MATOMO_URL')}/?module=API&token_auth=${this.configService.get('OLD_MATOMO_API_KEY')}&format=JSON&idSite=${this.configService.get('OLD_MATOMO_ID_SITE')}&period=day`;
    const lastStat = await this.statisticRepository.findOne({
      where: { id: Not(IsNull()) },
      order: { date: 'DESC' },
    });
    const lastStatDate = lastStat?.date ? new Date(lastStat?.date) : new Date(this.releaseDate);
    const matomoDate = `date=${this.generateDateString(lastStatDate)},today`;
    const [
      visitsByDay,
      oldVisitsByDay,
      restrictionsSearchsByDay,
      oldRestrictionsSearchsByDay,
      arreteDownloadsByDay,
      oldArreteDownloadsByDay,
      arreteCadreDownloadsByDay,
      oldArreteCadreDownloadsByDay,
      profileRepartitionByDay,
      oldProfileRepartitionByDay,
      departementRepartitionByDay,
      oldDepartementRepartitionByDay,
    ]
      = await Promise.all([
      firstValueFrom(this.httpService.get(`${matomoUrl}&method=VisitsSummary.getVisits&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${oldMatomoUrl}&method=VisitsSummary.getVisits&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${matomoUrl}&method=Events.getActionFromCategoryId&idSubtable=1&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${oldMatomoUrl}&method=Events.getActionFromCategoryId&idSubtable=1&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${matomoUrl}&method=Events.getActionFromCategoryId&idSubtable=2&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${oldMatomoUrl}&method=Events.getActionFromCategoryId&idSubtable=2&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${matomoUrl}&method=Events.getActionFromCategoryId&idSubtable=3&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${oldMatomoUrl}&method=Events.getActionFromCategoryId&idSubtable=3&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${matomoUrl}&method=Events.getNameFromActionId&idSubtable=1&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${oldMatomoUrl}&method=Events.getNameFromActionId&idSubtable=1&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${matomoUrl}&method=Events.getNameFromActionId&idSubtable=2&${matomoDate}`)),
      firstValueFrom(this.httpService.get(`${oldMatomoUrl}&method=Events.getNameFromActionId&idSubtable=2&${matomoDate}`)),
    ]);

    const statsToSave: any[] = [];
    for (const d = new Date(lastStatDate); d < new Date(); d.setDate(d.getDate() + 1)) {
      const stat: any = { date: new Date(d) };
      const day = this.generateDateString(d);

      stat.visits = (visitsByDay.data[day] ?? 0) + (oldVisitsByDay.data[day] ?? 0);

      let restrictionsSearch = restrictionsSearchsByDay.data[day];
      restrictionsSearch = restrictionsSearch?.find(matomoEvent => matomoEvent.label === 'CODE INSEE')?.nb_events;
      let oldRestrictionsSearch = oldRestrictionsSearchsByDay.data[day];
      oldRestrictionsSearch = oldRestrictionsSearch?.find(matomoEvent => matomoEvent.label === 'CODE INSEE')?.nb_events;
      stat.restrictionsSearch = (restrictionsSearch ? +restrictionsSearch : 0) + (oldRestrictionsSearch ? +oldRestrictionsSearch : 0);

      let arreteDownloads = 0;
      if (arreteDownloadsByDay.data[day] && arreteDownloadsByDay.data[day][0]?.nb_events) {
        arreteDownloads += +arreteDownloadsByDay.data[day][0].nb_events;
      }

      if (arreteCadreDownloadsByDay.data[day] && arreteCadreDownloadsByDay.data[day][0]?.nb_events) {
        arreteDownloads += +arreteCadreDownloadsByDay.data[day][0].nb_events;
      }

      let oldArreteDownloads = 0;
      if (oldArreteDownloadsByDay.data[day] && oldArreteDownloadsByDay.data[day][0]?.nb_events) {
        oldArreteDownloads += +oldArreteDownloadsByDay.data[day][0].nb_events;
      }

      if (oldArreteCadreDownloadsByDay.data[day] && oldArreteCadreDownloadsByDay.data[day][0]?.nb_events) {
        oldArreteDownloads += +oldArreteCadreDownloadsByDay.data[day][0].nb_events;
      }

      stat.arreteDownloads = arreteDownloads + oldArreteDownloads;

      const profileRepartitionTmp = {
        particulier: 0,
        exploitation: 0,
        entreprise: 0,
        collectivite: 0,
      };
      if (profileRepartitionByDay.data[day]) {
        for (const profile in profileRepartitionTmp) {
          // @ts-ignore
          if (Object.hasOwn(profileRepartitionTmp, profile)) {
            const event = profileRepartitionByDay.data[day].find(matomoEvent => matomoEvent.label === profile);
            profileRepartitionTmp[profile] += event ? +event.nb_events : 0;
          }
        }
      }

      if (oldProfileRepartitionByDay.data[day]) {
        for (const profile in profileRepartitionTmp) {
          // @ts-ignore
          if (Object.hasOwn(profileRepartitionTmp, profile)) {
            const event = oldProfileRepartitionByDay.data[day].find(matomoEvent => matomoEvent.label === profile);
            profileRepartitionTmp[profile] += event ? +event.nb_events : 0;
          }
        }
      }

      stat.profileRepartition = profileRepartitionTmp;

      const departementRepartitionTmp = {};
      const regionRepartitionTmp = {};
      const departements = await this.departementsService.getAllLight();
      for (const code of departements.map(d => d.code)) {
        departementRepartitionTmp[code] = 0;
      }

      for (const dep of departements) {
        regionRepartitionTmp[dep.region.code] = 0;
      }

      if (departementRepartitionByDay.data[day]) {
        for (const matomoEvent of departementRepartitionByDay.data[day]) {
          if (Object.prototype.hasOwnProperty.call(departementRepartitionTmp, matomoEvent.label)) {
            departementRepartitionTmp[matomoEvent.label] += Number(matomoEvent.nb_events);
            regionRepartitionTmp[departements.find(d => d.code === matomoEvent.label).region.code] += +matomoEvent.nb_events;
          }
        }
      }

      if (oldDepartementRepartitionByDay.data[day]) {
        for (const matomoEvent of oldDepartementRepartitionByDay.data[day]) {
          if (Object.prototype.hasOwnProperty.call(departementRepartitionTmp, matomoEvent.label)) {
            departementRepartitionTmp[matomoEvent.label] += Number(matomoEvent.nb_events);
            regionRepartitionTmp[departements.find(d => d.code === matomoEvent.label).region.code] += +matomoEvent.nb_events;
          }
        }
      }

      stat.departementRepartition = departementRepartitionTmp;
      stat.regionRepartition = regionRepartitionTmp;


      const subscriptions = await this.subscriptionsService.getAllLight();
      stat.subscriptions = subscriptions.filter(s => new Date(s.createdAt).toDateString() === d.toDateString()).length;

      statsToSave.push(stat);
    }

    if (lastStat) {
      await this.statisticRepository.update({ id: lastStat.id }, statsToSave.find(stat => stat.date.getTime() <= lastStatDate.getTime()));
    }

    await this.statisticRepository.save(statsToSave.filter(stat => stat.date.getTime() > lastStatDate.getTime()));
    this.loadStatistics();
  }

  /**
   * Génère une chaîne de caractères représentant une date au format `YYYY-MM-DD`.
   *
   * @param date - La date à formater.
   * @returns Une chaîne de caractères formatée.
   */
  generateDateString(date) {
    return date.toISOString().split('T')[0];
  }
}
