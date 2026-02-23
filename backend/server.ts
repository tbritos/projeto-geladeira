import { buildApp } from './src/app';

const start = async () => {
  const { app, tenantService } = buildApp();

  try {
    await tenantService.bootstrap();
    await app.listen({ port: 3333, host: '0.0.0.0' });
    app.log.info('Servidor rodando em http://localhost:3333');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
