import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin?.split(',').map((o) => o.trim()) ?? '*',
    credentials: true,
  });
  app.use(compression());
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (ms >= 1200) {
        logger.warn(
          `${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`,
        );
      }
    });
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const requestedPort = Number(process.env.PORT ?? 3000);
  const maxPort = requestedPort + 10;
  for (let port = requestedPort; port <= maxPort; port += 1) {
    try {
      await app.listen(port);
      if (port === requestedPort) {
        logger.log(`Server started on port ${port}`);
      } else {
        logger.warn(
          `Port ${requestedPort} band. Avtomatik ${port} portida ishga tushdi.`,
        );
      }
      return;
    } catch (err: any) {
      if (err?.code !== 'EADDRINUSE') throw err;
      if (port === maxPort) {
        throw err;
      }
    }
  }
}
bootstrap();
