import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

/**
 * Définition de la stratégie de sécurité JWT
 */
@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    // Utilisation du package passport pour la stratégie JWT, le secret est dans le fichier .env
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Valide le contenu du JWT et retourne les informations nécessaires.
   * Si nécessaire, on peut enrichir ou vérifier les informations à partir d'une source externe (ex: BDD).
   *
   * @param payload Contenu du JWT décrypté
   * @returns Les informations validées pour le contexte utilisateur
   */
  async validate(payload: any) {
    return payload;
  }
}