import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import { setupSwagger } from './common/swagger/swagger-setup.util'; 
import { envConfig } from './config/envs';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

let app: any;

export default async function handler(req: any, res: any) {
  // Inicializamos la app SOLO si no existe en caché (Cold Start)
  if (!app) {
    app = await NestFactory.create(AppModule);

    const isProd = envConfig.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
    const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || (!isProd && process.env.SWAGGER_ENABLED !== 'false');
    console.log(`Bootstrap vercel handler - NODE_ENV=${process.env.NODE_ENV} envConfig.NODE_ENV=${envConfig.NODE_ENV} swaggerEnabled=${swaggerEnabled}`);

    // 1. Configuración de CORS
    app.enableCors({
      origin: '*',
      methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      credentials: true,
    });

    // 2. Pipes Globales
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalInterceptors(new RequestLoggingInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    // 3. Prefijo
    app.setGlobalPrefix('api');

    // 4. Archivos estáticos (Adaptado para Vercel)
    const publicPath = join(__dirname, '..', 'public');
    app.use(express.static(publicPath));

    // 5. Swagger (opcional en prod)
    if (swaggerEnabled) {
      try {
        setupSwagger(app);
      } catch (error) {
        console.error('Swagger setup failed (vercel)', {
          message: (error as Error)?.message,
          stack: (error as Error)?.stack,
        });
        throw error;
      }
    } else {
      console.log('Swagger disabled in vercel handler');
    }

    await app.init();
  }

  // Obtenemos la instancia de Express y le pasamos la petición
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}