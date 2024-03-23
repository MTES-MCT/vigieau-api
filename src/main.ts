import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VigieauLogger } from './logger/vigieau.logger';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(VigieauLogger));
  app.use(
    helmet(),
  );

  // TODO à modifier en PROD
  app.enableCors({
    origin: '*',
    exposedHeaders: ['content-disposition'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.setGlobalPrefix('api');
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // OpenAPI
  const options = new DocumentBuilder()
    .setTitle('API VigiEau')
    .setVersion('0.1')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger', app, document);

  const configService = app.get(ConfigService);

  await app.listen(configService.get('PORT'));
}
bootstrap();
