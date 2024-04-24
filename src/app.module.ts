import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerInterceptor } from './core/interceptor/logger.interceptor';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZonesModule } from './zones/zones.module';
import { DepartementsModule } from './departements/departements.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StatisticsModule } from './statistics/statistics.module';
import AuthModule from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: `postgres://${process.env.DATABASE_USER}:${
          process.env.DATABASE_PASSWORD
        }@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${
          process.env.DATABASE_NAME
        }?${process.env.DATABASE_SSL_CERT ? 'sslmode=require' : ''}`,
        entities: [`${__dirname}/**/*.entity{.ts,.js}`],
        logging: ['test', 'dev', 'review', 'local'].includes(
          process.env.NODE_ENV,
        )
          ? ['error', 'schema']
          : false,
        migrations: [`${__dirname}/migrations/**/*{.ts,.js}`],
        cli: {
          migrationsDir: 'src/migrations',
        },
        synchronize: false,
        maxQueryExecutionTime: 1000,
        ssl: process.env.NODE_ENV !== 'local',
        extra:
          process.env.NODE_ENV !== 'local'
            ? {
              ssl: {
                rejectUnauthorized: false,
              },
            }
            : {},
      }),
      dataSourceFactory: (options) => {
        return new DataSource(options).initialize();
      },
    }),
    // Rate limit, 300 requêtes maximum toutes les 15min par IP
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 15,
        limit: 300,
      },
    ]),
    LoggerModule,
    SubscriptionsModule,
    ZonesModule,
    DepartementsModule,
    ScheduleModule.forRoot(),
    AuthModule,
    StatisticsModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
