import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create_subscription.dto';
import { CommunesService } from '../communes/communes.service';
import { HttpService } from '@nestjs/axios';
import { pick } from 'lodash';
import { ZonesService } from '../zones/zones.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbonnementMail } from '../zones/entities/abonnement_mail.entity';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VigieauLogger } from '../logger/vigieau.logger';
import { BrevoService } from '../brevo/brevo.service';
import { MattermostService } from '../mattermost/mattermost.service';
import { CronService } from '../cron/cron.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new VigieauLogger('SubscriptionsService');

  constructor(@InjectRepository(AbonnementMail)
              private readonly abonnementMailRepository: Repository<AbonnementMail>,
              private readonly communesService: CommunesService,
              private readonly httpService: HttpService,
              private readonly zonesService: ZonesService,
              private readonly brevoService: BrevoService,
              private readonly mattermostService: MattermostService,
              private readonly cronService: CronService) {
  }

  getAllLight() {
    return this.abonnementMailRepository.find({
      select: ['id', 'email', 'createdAt'],
    });
  }

  async create(createSubscriptionDto: CreateSubscriptionDto, req: any): Promise<any> {
    const subscription = <any>createSubscriptionDto;
    subscription.ip = req.ip;

    if (subscription.commune) {
      const commune = this.communesService.getCommune(subscription.commune);

      if (!commune) {
        throw new HttpException(
          `Code commune inconnu.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      subscription.libelleLocalisation = commune.nom;
    }

    if (subscription.idAdresse) {
      if (!subscription.lon || !subscription.lat) {
        throw new HttpException(
          `lon/lat requis dans le cas d’une inscription à l’adresse.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const { libelle, commune } = await this.resolveIdAdresse(subscription.idAdresse);

      subscription.commune = commune;
      subscription.libelleLocalisation = libelle;
    }

    subscription.typesEau = [...new Set(subscription.typesEau)].sort();

    try {
      subscription.situation = pick(
        this.computeNiveauxAlerte(subscription),
        ['AEP', 'SOU', 'SUP'],
      );
    } catch {
      subscription.situation = {};
    }

    const subscriptionExists = await this.abonnementMailRepository.exists({
      where: {
        email: subscription.email,
        commune: subscription.commune,
        idAdresse: subscription.idAdresse,
      },
    });
    if (subscriptionExists) {
      const changes = pick(subscription, 'profil', 'typesEau');
      await this.abonnementMailRepository.update({
        email: subscription.email,
        commune: subscription.commune,
        idAdresse: subscription.idAdresse,
      }, changes);
    } else {
      await this.abonnementMailRepository.save(subscription);

      await this.brevoService.sendMail(
        29,
        subscription.email,
        {
          city: this.communesService.getCommune(subscription.commune).nom,
          address: subscription.libelleLocalisation,
          unsubscribeUrl: this.brevoService.computeUnsubscribeUrl(subscription.email),
        },
      );
    }

    return subscription;
  }

  async resolveIdAdresse(idAdresse) {
    let result;

    try {
      result = await firstValueFrom(this.httpService.get(`https://plateforme.adresse.data.gouv.fr/lookup/${idAdresse}`));
    } catch (error) {
      if (error.response?.statusCode === 404) {
        throw new HttpException(
          `L’adresse renseignée n’existe pas`,
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        `Une erreur inattendue est survenue`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      libelle: this.buildLibelle(result.data),
      commune: result.data.commune.code,
    };
  }

  buildLibelle(adresse) {
    if (adresse.type === 'voie' || adresse.type === 'lieu-dit') {
      return `${adresse.nomVoie}, ${adresse.commune.nom}`;
    }

    if (adresse.type === 'numero') {
      return `${adresse.numero}${adresse.suffixe || ''}, ${adresse.voie.nomVoie}, ${adresse.commune.nom}`;
    }

    throw new HttpException(
      `Une erreur inattendue est survenue`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  computeNiveauxAlerte({ lon, lat, commune }) {
    const hasLonLat = lon || lat;

    const zones = hasLonLat
      ? this.zonesService.searchZonesByLonLat({ lon, lat })
      : this.zonesService.searchZonesByCommune(commune);

    const sup = zones.find(z => z.type === 'SUP');
    const sou = zones.find(z => z.type === 'SOU');
    const aep = zones.find(z => z.type === 'AEP');

    const result: any = { zones: [] };

    if (sup) {
      result.SUP = sup.niveauGravite;
      result.zones.push(sup.idZone);
    } else {
      result.SUP = 'pas_restriction';
    }

    if (sou) {
      result.SOU = sou.niveauGravite;
      result.zones.push(sou.idZone);
    } else {
      result.SOU = 'pas_restriction';
    }

    if (aep) {
      result.AEP = aep.niveauGravite;
      result.zones.push(aep.idZone);
    } else {
      result.AEP = 'pas_restriction';
    }

    return result;
  }

  getSubscriptionsByEmail(email: string) {
    return this.abonnementMailRepository.find({
      select: {
        id: true,
        email: true,
        profil: true,
        typesEau: true,
        libelleLocalisation: true,
        // @ts-ignore
        situation: true,
      },
      where: { email },
    });
  }

  deleteSubscriptionById(id: string, email: string) {
    return this.abonnementMailRepository.delete({ id: +id, email: email });
  }

  deleteSubscriptionByEmail(email: string) {
    return this.abonnementMailRepository.delete({ email: email });
  }

  @Cron(CronExpression.EVERY_DAY_AT_4PM)
  async tryUpdateSituations() {
    const canRun = await this.cronService.askForLock('emails');
    if (!canRun) {
      return;
    }
    try {
      await this.updateSituations();
    } catch (e) {
    } finally {
      await this.cronService.unlock('emails');
    }
  }

  async updateSituations() {
    const stats = {
      pas_restriction: 0,
      vigilance: 0,
      alerte: 0,
      alerte_renforcee: 0,
      crise: 0,
      pas_changement: 0,
      erreur: 0,
      nouveau: 0,
      mail_envoye: 0,
    };

    const subscriptions = await this.abonnementMailRepository.find({
      select: ['id', 'email', 'commune', 'lon', 'lat', 'typesEau', 'profil', 'libelleLocalisation', 'situation', 'createdAt'],
    });
    for (const subscription of subscriptions) {
      let situationUpdated = false;

      if (subscription.createdAt &&
        new Date(subscription.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
        stats.nouveau++;
      }

      try {
        // @ts-ignore
        const { AEP, SOU, SUP } = this.computeNiveauxAlerte(subscription);

        if (subscription.typesEau.includes('AEP') && AEP && subscription.situation?.AEP !== AEP) {
          stats[AEP]++;
          situationUpdated = true;
        }

        if (subscription.typesEau.includes('SOU') && SOU && subscription.situation?.SOU !== SOU) {
          stats[SOU]++;
          situationUpdated = true;
        }

        if (subscription.typesEau.includes('SUP') && SUP && subscription.situation?.SUP !== SUP) {
          stats[SUP]++;
          situationUpdated = true;
        }

        if (situationUpdated) {
          // TMP
          this.logger.log(`CHECK SUBSCRIPTION - ${AEP} - ${SOU} - ${SUP} - ${JSON.stringify(subscription)}`);

          await this.brevoService.sendSituationUpdate(
            subscription.email,
            AEP,
            Boolean(subscription.situation?.AEP && subscription.situation.AEP !== AEP),
            SUP,
            Boolean(subscription.situation?.SUP && subscription.situation.SUP !== SUP),
            SOU,
              Boolean( subscription.situation?.SOU && subscription.situation.SOU !== SOU),
            subscription.commune,
            subscription.libelleLocalisation,
            subscription.profil,
          );

          stats.mail_envoye++;

          await this.abonnementMailRepository.update(
            { id: subscription.id },
            { situation: { AEP, SOU, SUP } },
          );
        } else {
          stats.pas_changement++;
        }
      } catch (error) {
        stats.erreur++;
        this.logger.error(`MISE A JOUR SITUATION - ${JSON.stringify(subscription)} - `, error);
      }
    }
    await this.sendMattermostNotification(stats);
  }

  async sendMattermostNotification(stats) {
    const sentences = [];
    if (stats.mail_envoye) {
      sentences.push(`- **${stats.mail_envoye}** emails envoyés 📧`);
    }

    if (stats.nouveau) {
      sentences.push(`- **${stats.nouveau}** usagers se sont inscrits au cours des dernières 24h 🎊`);
    }

    if (stats.pas_restriction) {
      sentences.push(`- **${stats.pas_restriction}** usagers n’ont plus de restrictions 🚰`);
    }

    if (stats.vigilance) {
      sentences.push(`- **${stats.vigilance}** usagers sont passés en **Vigilance** 💧`);
    }

    if (stats.alerte) {
      sentences.push(`- **${stats.alerte}** usagers sont passés en **Alerte** 😬`);
    }

    if (stats.alerte_renforcee) {
      sentences.push(`- **${stats.alerte_renforcee}** usagers sont passés en **Alerte renforcée** 🥵`);
    }

    if (stats.crise) {
      sentences.push(`- **${stats.crise}** usagers sont passés en **Crise** 🔥`);
    }

    if (stats.pas_changement) {
      sentences.push(`- **${stats.pas_changement}** usagers n’ont pas de changement 👻`);
    }

    if (stats.erreur) {
      sentences.push(`- **${stats.erreur}** usagers sont en erreur 🧨`);
    }

    const message = sentences.join('\n');
    await this.mattermostService.sendMessage(message);
  }
}
