import morgan from 'morgan';
import { nanoid } from 'nanoid';
import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (req, res, next) => {
  const id = (req.headers['x-request-id'] as string) ?? nanoid(12);
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};

morgan.token('id', (req) => (req as { id?: string }).id ?? '-');

export const requestLogger = morgan(':id :method :url :status :res[content-length] - :response-time ms');
