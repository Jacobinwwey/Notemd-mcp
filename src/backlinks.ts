import fs from 'fs/promises';
import path from 'path';
import { logger } from './index.js';

const BACKLINKS_DIR = path.join(process.cwd(), 'backlinks');

async function ensureBacklinksDir() {
  try {
    await fs.mkdir(BACKLINKS_DIR, { recursive: true });
    logger.info(`Backlinks directory initialized at ${BACKLINKS_DIR}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create backlinks directory';
    logger.error('Failed to create backlinks directory:', err);
    throw new Error(errorMessage);
  }
}

export async function createBacklinks(title: string, content: string) {
  await ensureBacklinksDir();
  
  // Extract keywords - simple implementation that finds significant words
  const keywords = new Set<string>();
  const words = content.match(/\b\w{4,}\b/g) || [];
  
  for (const word of words) {
    // Skip common words and numbers
    if (!/^(the|and|for|with|this|that|your|have|from|about|when|where|how|why|which|their|there|been|into|only|more|some|such|than|then|them|were|what|will|would|does|said|like|just|also|very|much|many|most|more|less|same|other|another|first|last|next|previous|new|old|good|bad|big|small|long|short|high|low|great|little|few|several|own|same|different|same|number|\d+)$/i.test(word)) {
      keywords.add(word.toLowerCase());
    }
  }

  // Process content by converting keywords to Obsidian links
  let processedContent = content;
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    processedContent = processedContent.replace(regex, `[[${keyword}]]`);
  }

  // Create backlink files for each keyword
  for (const keyword of keywords) {
    const keywordPath = path.join(BACKLINKS_DIR, `${keyword}.md`);
    try {
      let existingContent = '';
      try {
        existingContent = await fs.readFile(keywordPath, 'utf-8');
      } catch {} // File doesn't exist yet
      
      if (!existingContent.includes(`# ${keyword}`)) {
        await fs.writeFile(
          keywordPath, 
          `# ${keyword}\n\n[[${title}]]\n`,
          'utf-8'
        );
      } else {
        await fs.appendFile(keywordPath, `[[${title}]]\n`, 'utf-8');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create backlink';
      logger.error(`Failed to create backlink for ${keyword}:`, err);
      throw new Error(errorMessage);
    }
  }

  // Extract all Obsidian style links including processed ones
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const links = [...processedContent.matchAll(linkRegex)].map(match => match[1]);

  // Create backlink files with proper headers
  for (const link of links) {
    const linkPath = path.join(BACKLINKS_DIR, `${link}.md`);
    try {
      // Check if file exists to avoid duplicate headers
      let existingContent = '';
      try {
        existingContent = await fs.readFile(linkPath, 'utf-8');
      } catch {} // File doesn't exist yet
      
      if (!existingContent.includes(`# ${link}`)) {
        await fs.writeFile(
          linkPath, 
          `# ${link}\n\n[[${title}]]\n`,
          'utf-8'
        );
      } else {
        await fs.appendFile(linkPath, `[[${title}]]\n`, 'utf-8');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create backlink';
      logger.error(`Failed to create backlink for ${link}:`, err);
      throw new Error(errorMessage);
    }
  }

  return processedContent;
}
