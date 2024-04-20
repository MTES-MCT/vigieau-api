import { Injectable } from '@nestjs/common';
import * as Brevo from '@getbrevo/brevo'
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CommunesService } from '../communes/communes.service';
import process from 'node:process';

@Injectable()
export class BrevoService {
  apiInstance;

  constructor(private readonly jwtService: JwtService,
              private readonly communesService: CommunesService) {
    this.apiInstance = new Brevo.TransactionalEmailsApi();
    const apiKey = this.apiInstance.authentications['apiKey']
    apiKey.apiKey = process.env.BREVO_API_KEY;
  }

  sendSituationUpdate(email, niveauAlerte, codeCommune, libelleLocalisation) {
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === '1') {
      const recipient = process.env.EMAIL_NOTIFICATIONS_DEV_RECIPIENT || email

      return this.sendMail(
        this.getTemplateId(niveauAlerte),
        recipient,
        {
          address: libelleLocalisation,
          city: this.communesService.getCommune(codeCommune).nom,
          unsubscribeUrl: this.computeUnsubscribeUrl(email),
          niveaugravite: niveauAlerte
        }
      )
    }
  }

  getTemplateId(niveauAlerte) {
    if (niveauAlerte === 'Aucun') {
      return 32
    }

    if (niveauAlerte === 'vigilance') {
      return 30
    }

    return 31
  }

  computeUnsubscribeUrl(email) {
    const token = this.jwtService.sign({email}, {
        secret: process.env.JWT_SECRET,
        expiresIn: '2d'
    })
    return `${process.env.WEBSITE_URL}/abonnements?token=${token}`
  }

  sendMail(templateId, to, params) {
    if (!process.env.BREVO_API_KEY) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('BREVO_API_KEY is required')
      } else {
        return
      }
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail()
    sendSmtpEmail.templateId = templateId
    sendSmtpEmail.to = [{email: to}]
    sendSmtpEmail.params = params

    return this.apiInstance.sendTransacEmail(sendSmtpEmail)
  }
}