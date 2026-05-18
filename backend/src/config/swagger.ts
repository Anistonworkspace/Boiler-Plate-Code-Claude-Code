import swaggerJsdoc from 'swagger-jsdoc';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Boilerplate App API',
      version: '1.0.0',
      description: 'Production-grade fullstack PWA boilerplate REST API',
      contact: { name: 'Aniston Technologies LLP' },
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Development' },
      { url: 'https://app.example.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

const spec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'Boilerplate App API Docs',
    customCss: '.topbar { display: none }',
  }));
  app.get('/api/docs.json', (_req, res) => res.json(spec));
}
