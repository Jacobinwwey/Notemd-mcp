import fs from 'fs/promises';
import path from 'path';
import { logger } from '../index.js';

export async function generateKeywordList(
  originalFilename: string,
  keywords: string[],
  outputDir: string
): Promise<void> {
  try {
    const keywordsDir = path.join(outputDir, 'keywords');
    await fs.mkdir(keywordsDir, { recursive: true });

    const outputPath = path.join(keywordsDir, 'keyword_list.txt');
    const content = [originalFilename, ...keywords].join('\n');

    await fs.writeFile(outputPath, content);
    logger.info(`Generated keyword list at ${outputPath}`);
  } catch (err) {
    logger.error(`Failed to generate keyword list: ${err}`);
    throw err;
  }
}
