import { Injectable } from '@nestjs/common';
import * as Brevo from '@getbrevo/brevo';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CommunesService } from '../communes/communes.service';
import process from 'node:process';

@Injectable()
export class BrevoService {
  apiInstance;

  constructor(private readonly jwtService: JwtService,
              private readonly communesService: CommunesService) {
    this.apiInstance = new Brevo.TransactionalEmailsApi();
    const apiKey = this.apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
  }

  sendSituationUpdate(email, niveauGraviteAep, niveauGraviteSup, niveauGraviteSou, codeCommune, libelleLocalisation, profil) {
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === '1') {
      const recipient = process.env.EMAIL_NOTIFICATIONS_DEV_RECIPIENT || email;

      return this.sendMail(
        this.getTemplateId(niveauGraviteAep, niveauGraviteSup, niveauGraviteSou),
        recipient,
        {
          address: libelleLocalisation,
          city: this.communesService.getCommune(codeCommune).nom,
          unsubscribeUrl: this.computeUnsubscribeUrl(email),
          niveauGraviteAep: this.getniveauGraviteFr(niveauGraviteAep),
          niveauGraviteSup: this.getniveauGraviteFr(niveauGraviteSup),
          niveauGraviteSou: this.getniveauGraviteFr(niveauGraviteSou),
          restrictionUrl: `${process.env.WEBSITE_URL}/situation?profil=${profil}&adresse=${libelleLocalisation}`,
        },
      );
    }
  }

  getTemplateId(niveauGraviteAep, niveauGraviteSup, niveauGraviteSou) {
    // TODO CHANGER TEMPLATE IDS
    if (niveauGraviteAep === 'pas_restriction' && niveauGraviteSup === 'pas_restriction' && niveauGraviteSou === 'pas_restriction') {
      return 32;
    }

    return 31;
  }

  getniveauGraviteFr(niveauGravite) {
    switch (niveauGravite) {
      case 'pas_restriction':
        return 'Pas de restrictions';
      case 'vigilance':
        return 'Vigilance';
      case 'alerte':
        return 'Alerte';
      case 'alerte_renforcee':
        return 'Alerte renforcée';
      case 'crise':
        return 'Crise';
    }
  }

  computeUnsubscribeUrl(email) {
    const token = this.jwtService.sign({ email }, {
      secret: process.env.JWT_SECRET,
      expiresIn: '2d',
    });
    return `${process.env.WEBSITE_URL}/abonnements?token=${token}`;
  }

  sendMail(templateId, to, params) {
    if (!process.env.BREVO_API_KEY) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('BREVO_API_KEY is required');
      } else {
        return;
      }
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.templateId = templateId;
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.params = params;

    return this.apiInstance.sendTransacEmail(sendSmtpEmail);
  }
}