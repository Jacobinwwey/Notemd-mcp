import { logger } from '../index.js';
import { PROCESSING_RULES } from './prompts.js';

export async function splitMarkdown(
  content: string, 
  chunkSize: number = 3000
): Promise<string[]> {
  try {
    const paragraphs = content.split(/(\n\s*\n+)/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentCount = 0;

    for (let i = 0; i < paragraphs.length; i += 2) {
      const para = paragraphs[i];
      if (!para.trim()) continue;
      
      const paraWordCount = para.split(/\s+/).length;
      
      if (currentCount + paraWordCount > chunkSize && currentCount > 0) {
        chunks.push(currentChunk.join(''));
        currentChunk = [];
        currentCount = 0;
      }
      
      currentChunk.push(para + (paragraphs[i+1] || ''));
      currentCount += paraWordCount;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(''));
    }

    logger.info(`Split content into ${chunks.length} chunks`);
    return chunks;
  } catch (err) {
    logger.error(`Failed to split markdown: ${err}`);
    return [content];
  }
}
