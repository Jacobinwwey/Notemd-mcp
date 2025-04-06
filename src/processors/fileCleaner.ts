import { logger } from '../index.js';
import fs from 'fs/promises';
import path from 'path';

export async function cleanDuplicateFiles(dirPath: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    // Group by normalized names
    const groups = new Map<string, string[]>();
    
    for (const file of mdFiles) {
      const normalized = normalizeFileName(file);
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized)?.push(file);
    }

    // Process each group
    for (const [normName, fileGroup] of groups) {
      if (fileGroup.length > 1) {
        // Keep the oldest file
        const sorted = await sortFilesByAge(dirPath, fileGroup);
        for (let i = 1; i < sorted.length; i++) {
          await fs.unlink(path.join(dirPath, sorted[i]));
          logger.info(`Deleted duplicate file: ${sorted[i]}`);
        }
      }
    }
  } catch (err) {
    logger.error(`Failed to clean duplicates: ${err}`);
  }
}

function normalizeFileName(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

async function sortFilesByAge(dirPath: string, files: string[]): Promise<string[]> {
  const withStats = await Promise.all(
    files.map(async file => {
      const stat = await fs.stat(path.join(dirPath, file));
      return { file, birthtime: stat.birthtime };
    })
  );
  
  return withStats
    .sort((a, b) => a.birthtime.getTime() - b.birthtime.getTime())
    .map(x => x.file);
}
