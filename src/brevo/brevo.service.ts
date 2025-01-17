import { Injectable } from '@nestjs/common';
import * as Brevo from '@getbrevo/brevo';
import { JwtService } from '@nestjs/jwt';
import { CommunesService } from '../communes/communes.service';
import process from 'node:process';
import { ConfigService } from '@nestjs/config';
import { VigieauLogger } from '../logger/vigieau.logger';

@Injectable()
export class BrevoService {
  private readonly logger = new VigieauLogger('BrevoService');
  private readonly apiInstance;

  constructor(private readonly jwtService: JwtService,
              private readonly configService: ConfigService,
              private readonly communesService: CommunesService) {
    this.apiInstance = new Brevo.TransactionalEmailsApi();
    const apiKey = this.apiInstance.authentications['apiKey'];
    apiKey.apiKey = this.configService.get<string>('BREVO_API_KEY');
  }

  /**
   * Envoie une mise à jour de situation par email via Brevo.
   * Si les notifications sont désactivées, la méthode retourne immédiatement.
   *
   * @param email Adresse email du destinataire.
   * @param niveauGraviteAep Niveau de gravité pour l'eau potable.
   * @param changementAep Indique si le niveau AEP a changé.
   * @param niveauGraviteSup Niveau de gravité pour les eaux superficielles.
   * @param changementSup Indique si le niveau des eaux superficielles a changé.
   * @param niveauGraviteSou Niveau de gravité pour les eaux souterraines.
   * @param changementSou Indique si le niveau des eaux souterraines a changé.
   * @param codeCommune Code INSEE de la commune.
   * @param libelleLocalisation Libellé de localisation pour l'adresse.
   * @param profil Profil utilisateur pour personnaliser l'URL de restriction.
   */
  sendSituationUpdate(
    email: string,
    niveauGraviteAep: string,
    changementAep: boolean,
    niveauGraviteSup: string,
    changementSup: boolean,
    niveauGraviteSou: string,
    changementSou: boolean,
    codeCommune: string,
    libelleLocalisation: string,
    profil: string,
  ) {
    const isEmailEnabled = this.configService.get<string>('EMAIL_NOTIFICATIONS_ENABLED') === '1';
    if (!isEmailEnabled) {
      return;
    }

    const recipient = this.configService.get<string>('EMAIL_NOTIFICATIONS_DEV_RECIPIENT') || email;

    const params = {
      address: libelleLocalisation,
      city: this.communesService.getCommune(codeCommune).nom,
      unsubscribeUrl: this.computeUnsubscribeUrl(email),
      niveauGraviteAep: this.getniveauGraviteFr(niveauGraviteAep),
      changementAep,
      niveauGraviteSup: this.getniveauGraviteFr(niveauGraviteSup),
      changementSup,
      niveauGraviteSou: this.getniveauGraviteFr(niveauGraviteSou),
      changementSou,
      restrictionUrl: `${this.configService.get<string>(
        'WEBSITE_URL',
      )}/situation?profil=${profil}&adresse=${libelleLocalisation}`,
    };

    return this.sendMail(
      this.getTemplateId(niveauGraviteAep, niveauGraviteSup, niveauGraviteSou),
      recipient,
      params,
    );
  }

  /**
   * Détermine l'ID du template à utiliser pour l'email en fonction des niveaux de gravité.
   *
   * @param niveauGraviteAep Niveau de gravité pour l'eau potable.
   * @param niveauGraviteSup Niveau de gravité pour les eaux superficielles.
   * @param niveauGraviteSou Niveau de gravité pour les eaux souterraines.
   * @returns ID du template à utiliser (32 pour "pas de restrictions", 65 sinon).
   */
  getTemplateId(niveauGraviteAep, niveauGraviteSup, niveauGraviteSou) {
    if (
      niveauGraviteAep === 'pas_restriction' &&
      niveauGraviteSup === 'pas_restriction' &&
      niveauGraviteSou === 'pas_restriction'
    ) {
      return 32;
    }

    return 65;
  }

  /**
   * Traduit un niveau de gravité en une description lisible en français.
   *
   * @param niveauGravite Niveau de gravité (ex: "vigilance", "alerte").
   * @returns Traduction française du niveau de gravité.
   */
  getniveauGraviteFr(niveauGravite: string): string {
    const graviteMapping = {
      pas_restriction: 'pas de restrictions',
      vigilance: 'vigilance',
      alerte: 'alerte',
      alerte_renforcee: 'alerte renforcée',
      crise: 'crise',
    };

    return graviteMapping[niveauGravite] || '';
  }

  /**
   * Génère un lien de désinscription contenant un token JWT sécurisé.
   *
   * @param email Adresse email pour laquelle le lien de désinscription est généré.
   * @returns URL de désinscription avec le token JWT.
   */
  computeUnsubscribeUrl(email: string): string {
    const token = this.jwtService.sign({ email }, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '7d',
    });
    return `${this.configService.get<string>('WEBSITE_URL')}/abonnements?token=${token}`;
  }

  /**
   * Envoie un email transactionnel via Brevo.
   *
   * @param templateId ID du template à utiliser.
   * @param to Adresse email du destinataire.
   * @param params Paramètres dynamiques à injecter dans le template.
   */
  sendMail(templateId, to, params) {
    if (!this.configService.get<string>('BREVO_API_KEY')) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('BREVO_API_KEY is required');
      } else {
        return;
      }
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.templateId = templateId;
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.params = params;

    try {
      return this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      this.logger.error(`Error sending email`, error.message);
    }
  }
}