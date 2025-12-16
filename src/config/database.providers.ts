import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envConfig } from './envs';

export const databaseProviders: TypeOrmModuleOptions = {
  type: 'postgres',
  // type: 'mysql',
  host:
    envConfig.NODE_ENV === 'development' ? envConfig.HOST_DEV : envConfig.HOST,
  port:
    envConfig.NODE_ENV === 'development'
      ? envConfig.DB_PORT_DEV
      : envConfig.DB_PORT,
  database:
    envConfig.NODE_ENV === 'development'
      ? envConfig.DB_NAME_DEV
      : envConfig.DB_NAME,
  username:
    envConfig.NODE_ENV === 'development'
      ? envConfig.DB_USERNAME_DEV
      : envConfig.DB_USERNAME,
  password:
    envConfig.NODE_ENV === 'development'
      ? envConfig.DB_PASSWORD_DEV
      : envConfig.DB_PASSWORD,
  autoLoadEntities: true, // Carga las entidades automáticamente
  synchronize: envConfig.NODE_ENV === 'production' ? false : true, // Solo en desarrollo // Sincroniza la base de datos con las entidades (no recomendado para producción)
  ssl: true, // Obligatorio para Neon.tech y Vercel
  extra: {
    // Configuraciones del pool de conexiones
    max: envConfig.NODE_ENV === 'development' ? 20 : 15, // Máximo de conexiones
    connectionTimeoutMillis: 5000, // Timeout de conexión
    idleTimeoutMillis: 50000, // Cierra conexiones inactivas después de 50 segundos
    allowExitOnIdle: true, // Permite que el proceso de Node.js termine si no hay conexiones activas
    ssl: {
      rejectUnauthorized: false
    }
  }
  //ssl: { rejectUnauthorized: false },
};
