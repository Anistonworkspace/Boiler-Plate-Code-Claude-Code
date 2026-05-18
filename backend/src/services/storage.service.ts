import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const storage = {
  async ensureDir(): Promise<void> {
    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
  },
  resolvePath(filename: string): string {
    return path.join(env.UPLOAD_DIR, filename);
  },
  async delete(filename: string): Promise<void> {
    try {
      await fs.unlink(path.join(env.UPLOAD_DIR, filename));
    } catch {
      // ignore if already gone
    }
  },
  async read(filename: string): Promise<Buffer> {
    return fs.readFile(path.join(env.UPLOAD_DIR, filename));
  },
};
