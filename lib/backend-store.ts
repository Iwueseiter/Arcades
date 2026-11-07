import { promises as fs } from 'node:fs';
import path from 'node:path';

export type JsonFileName = 'leaderboard' | 'wallet';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson<T>(fileName: JsonFileName, fallback: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${fileName}.json`);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw.trim()) {
      await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

export async function writeJson<T>(fileName: JsonFileName, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}
