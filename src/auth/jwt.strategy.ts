import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

/**
 * Définition de la stratégie de sécurité JWT
 */
@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    // Utilisation du package passport pour la stratégie JWT, le secret est dans le fichier .env
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return payload;
  }
}