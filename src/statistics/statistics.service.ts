import { Injectable } from '@nestjs/common';
import process from 'node:process';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DepartementsService } from '../departements/departements.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Statistic } from './entities/statistic.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class StatisticsService {

  statistics: any;

  constructor(@InjectRepository(Statistic)
              private readonly statisticRepository: Repository<Statistic>,
              private readonly httpService: HttpService,
              private readonly departementsService: DepartementsService,
              private readonly subscriptionsService: SubscriptionsService) {
    this.loadStatistics();
  }

  findAll() {
    return this.statistics;
  }

  async loadStatistics() {
    const statistics = await this.statisticRepository.find({
      order: {
        date: 'ASC',
      }
    });
    const last30Days = statistics.slice(-30)
    const statsToReturn = {
      subscriptions: 0,
      profileRepartition: {},
      departementRepartition: {},
      regionRepartition: {},
      statsByDay: []
    }
    for (const stat of last30Days) {
      for (const [profile, value] of Object.entries(stat.profileRepartition)) {
        statsToReturn.profileRepartition[profile] = statsToReturn.profileRepartition[profile]
          ? statsToReturn.profileRepartition[profile] + value
          : value
      }

      for (const [departement, value] of Object.entries(stat.departementRepartition)) {
        statsToReturn.departementRepartition[departement] = statsToReturn.departementRepartition[departement]
          ? statsToReturn.departementRepartition[departement] + value
          : value
      }

      for (const [region, value] of Object.entries(stat.regionRepartition)) {
        statsToReturn.regionRepartition[region] = statsToReturn.regionRepartition[region]
          ? statsToReturn.regionRepartition[region] + value
          : value
      }
    }

    statsToReturn.subscriptions = statistics.reduce((accumulator, object) => accumulator + object.subscriptions, 0)

    statsToReturn.statsByDay = statistics.map(s => {
      const statsLight: any = {}
      statsLight.date = s.date
      statsLight.visits = s.visits
      statsLight.arreteDownloads = s.arreteDownloads
      statsLight.restrictionsSearch = s.restrictionsSearch
      return statsLight
    });

    this.statistics = statsToReturn;
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  async computeStatistics() {
    const matomoUrl = `${process.env.MATOMO_URL}/?module=API&token_auth=${process.env.MATOMO_API_KEY}&format=JSON&idSite=${process.env.MATOMO_ID_SITE}&period=day`;
    const oldMatomoUrl = `${process.env.OLD_MATOMO_URL}/?module=API&token_auth=${process.env.OLD_MATOMO_API_KEY}&format=JSON&idSite=${process.env.OLD_MATOMO_ID_SITE}&period=day`;
    const lastStat = await this.statisticRepository.findOne({
      where: { id: Not(IsNull()) },
      order: { date: 'DESC' },
    });
    const lastStatDate = lastStat?.date ? new Date(lastStat?.date) : new Date('2023-07-11');
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
      stat.restrictionsSearch = (+restrictionsSearch ?? 0) + (+oldRestrictionsSearch ?? 0);

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

  generateDateString(date) {
    const year = date.toLocaleString('default', { year: 'numeric' });
    const month = date.toLocaleString('default', { month: '2-digit' });
    const day = date.toLocaleString('default', { day: '2-digit' });

    return [year, month, day].join('-');
  }
}
