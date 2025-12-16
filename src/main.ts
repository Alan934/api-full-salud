import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envConfig } from './config/envs';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './common/swagger/swagger-setup.util';
import { join } from 'path';
import * as express from 'express';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Habilitar CORS pr
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Configurar para servir archivos estáticos
  const publicPath = join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // Middleware para servir index.html en la raíz
  app.use((req, res, next) => {
    if (req.path === '/') {
      res.sendFile(join(publicPath, 'index.html'));
    } else {
      next();
    }
  });

  // Deshabilitar Swagger en producción para evitar fallos por dependencias circulares en runtime serverless
  const isProd = envConfig.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (!isProd) {
    try {
      setupSwagger(app);
    } catch (error) {
      // Surface schema errors (e.g., circular refs) in Vercel logs
      console.error('Swagger setup failed', {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
      });
      throw error;
    }
  } else {
    console.log('Swagger disabled in production');
  }

  const port = envConfig.PORT;

  await app.listen(port || 3000);
}

bootstrap();
