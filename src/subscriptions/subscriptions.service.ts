import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create_subscription.dto';
import { SubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor() {
  }

  async create(createSubscriptionDto: CreateSubscriptionDto, req: any): Promise<any> {
    const subscription = <SubscriptionDto> createSubscriptionDto;
    subscription.ip = req.ip;

    // if (subscription.commune) {
    //   const commune = getCommune(subscription.commune)
    //
    //   if (!commune) {
    //     throw new HttpException(
    //       `Code commune inconnu.`,
    //       HttpStatus.BAD_REQUEST,
    //     );
    //   }
    //
    //   subscription.libelleLocalisation = commune.nom
    // }
    //
    // if (subscription.idAdresse) {
    //   if (!subscription.lon || !subscription.lat) {
    //     throw new HttpException(
    //       `lon/lat requis dans le cas d’une inscription à l’adresse.`,
    //       HttpStatus.BAD_REQUEST,
    //     );
    //   }
    //
    //   const {libelle, commune} = await resolveIdAdresse(subscription.idAdresse)
    //
    //   subscription.commune = commune
    //   subscription.libelleLocalisation = libelle
    // }

    subscription.typesZones = [...new Set(subscription.typesZones)].sort()

    return subscription;
  }
}
