import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import JwtStrategy from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '2d' },
    }),
  ],
  providers: [JwtStrategy],
  controllers: [],
  exports: [],
})
export default class AuthModule {}