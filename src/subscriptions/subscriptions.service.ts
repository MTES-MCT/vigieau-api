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

@Injectable()
export class SubscriptionsService {
  private readonly logger = new VigieauLogger('SubscriptionsService');

  constructor(@InjectRepository(AbonnementMail)
              private readonly abonnementMailRepository: Repository<AbonnementMail>,
              private readonly communesService: CommunesService,
              private readonly httpService: HttpService,
              private readonly zonesService: ZonesService) {
  }

  async create(createSubscriptionDto: CreateSubscriptionDto, req: any): Promise<any> {
    const subscription = <any>createSubscriptionDto;
    subscription.ip = req.ip;
    subscription.typesEau = subscription.typesZones;

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

  computeNiveauxAlerte({ lon, lat, commune, profil, typesEau }) {
    const hasLonLat = lon || lat;

    const zones = hasLonLat
      ? this.zonesService.searchZonesByLonLat({ lon, lat })
      : this.zonesService.searchZonesByCommune(commune);

    const sup = zones.find(z => z.type === 'SUP');
    const sou = zones.find(z => z.type === 'SOU');
    const aep = zones.find(z => z.type === 'AEP');

    const result: any = { zones: [] };

    if (typesEau.includes('SUP')) {
      if (sup) {
        result.SUP = sup.niveauGravite;
        result.zones.push(sup.idZone);
      } else {
        result.SUP = null;
      }
    }

    if (typesEau.includes('SOU')) {
      if (sou) {
        result.SOU = sou.niveauGravite;
        result.zones.push(sou.idZone);
      } else {
        result.SOU = null;
      }
    }

    if (typesEau.includes('AEP')) {
      if (aep) {
        result.AEP = aep.niveauGravite;
        result.zones.push(aep.idZone);
      } else {
        result.AEP = null;
      }
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

  @Cron(CronExpression.EVERY_DAY_AT_5PM)
  async updateSituations() {
    const stats = {
      Aucun: 0,
      Vigilance: 0,
      Alerte: 0,
      'Alerte renforcée': 0,
      Crise: 0,
      'Pas de changement': 0,
      'En erreur': 0,
    };

    const subscriptions = await this.abonnementMailRepository.find();
    subscriptions.forEach((subscription) => {
      let situationUpdated = false;
      try {
        // @ts-ignore
        const {AEP, SOU, SUP} = this.computeNiveauxAlerte(subscription)

      } catch (error) {
        stats['En erreur']++;
        this.logger.error('MISE A JOUR SITUATION', error);
      }
    });
  }
}
