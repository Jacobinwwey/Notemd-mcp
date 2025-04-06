import { getProvider } from '../llm/providers.js';
import { PROCESSING_RULES } from './prompts.js';
import { logger } from '../index.js';
import fs from 'fs/promises';
import path from 'path';
import { splitMarkdown } from './fileSplitter.js';
import { cleanDuplicateFiles } from './fileCleaner.js';
import { generateKeywordList } from './keywordGenerator.js';
import { scheduleWithTimeout } from '../scheduler.js';

interface ProcessMarkdownOptions {
  providerName?: string;
  intensity?: number;
  outputPath?: string;
  chunkSize?: number;
  maxTokens?: number;
  timeoutHours?: number;
  model?: string;
  temperature?: number;
}

export async function processMarkdown(
  content: string,
  options: ProcessMarkdownOptions = {}
): Promise<string> {
  const {
    providerName = 'deepseek',
    intensity = 1,
    outputPath,
    chunkSize = 3000,
    maxTokens = 8192,
    timeoutHours = 8
  } = options;

  const provider = getProvider(providerName, {
    temperature: Math.min(1.0, Math.max(0.1, intensity * 0.3 + 0.2)),
    maxTokens,
    timeoutHours
  });

  return scheduleWithTimeout(async () => {
    // Step 1: Split content if needed
    const chunks = content.length > chunkSize * 2 
      ? await splitMarkdown(content, chunkSize)
      : [content];
    
    // Step 2: Process each chunk with retries
    let processedChunks = [];
    for (const [index, chunk] of chunks.entries()) {
      try {
        logger.debug(`Processing chunk ${index + 1} (${chunk.length} chars)`);
        const processed = await provider.processMarkdown(chunk);
        processedChunks.push(processed);
        logger.debug(`Successfully processed chunk ${index + 1}/${chunks.length}`);
      } catch (err) {
        logger.error(`Failed to process chunk ${index + 1}:`, err);
        processedChunks.push(chunk); // Fallback to original content
      }
    }
    
    // Step 3: Merge processed chunks
    let processed = processedChunks.join('\n\n');
    
    // Step 4: Apply advanced processing rules
    processed = applyRules(processed);
    
    // Step 5: Extract and save keywords if output path provided
    if (outputPath) {
      await extractAndSaveKeywords(processed, outputPath);
      await cleanDuplicateFiles(outputPath);
    }
    
    logger.info(`Processed markdown with ${providerName} (intensity: ${intensity})`);
    return processed;
  }, timeoutHours * 3600 * 1000);
}

async function extractAndSaveKeywords(content: string, outputDir: string) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    // Enhanced keyword extraction with duplicate detection
    const keywordPattern = /\[\[([^\[\]]+)\]\]/g;
    const matches = [...content.matchAll(keywordPattern)];
    const keywordMap = new Map<string, number>();
    
    for (const match of matches) {
      const keyword = match[1].trim();
      if (!keyword) continue;
      
      // Normalize keyword (singular/plural handling)
      const normalized = normalizeKeyword(keyword);
      keywordMap.set(normalized, (keywordMap.get(normalized) || 0) + 1);
    }
    
    // Generate keyword list file
    const keywordListPath = path.join(outputDir, 'keyword_list.txt');
    await fs.writeFile(
      keywordListPath,
      Array.from(keywordMap.keys()).join('\n'),
      'utf-8'
    );
    
    logger.info(`Saved ${keywordMap.size} keywords to ${outputDir}`);
  } catch (err) {
    logger.error(`Failed to extract/save keywords: ${err}`);
    throw err;
  }
}

function normalizeKeyword(keyword: string): string {
  // Handle plural forms (basic implementation)
  if (keyword.endsWith('s') && keyword.length > 1) {
    const singular = keyword.slice(0, -1);
    if (keyword.endsWith('es')) {
      return keyword.slice(0, -2);
    }
    if (keyword.endsWith('ies')) {
      return keyword.slice(0, -3) + 'y';
    }
    return singular;
  }
  return keyword;
}

function getSafeFilename(keyword: string): string {
  let safeName = keyword
    .replace(/[\\/:*?"<>|£$%^]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (safeName.length > 128) {
    const hash = require('crypto')
      .createHash('sha256')
      .update(keyword)
      .digest('hex')
      .substring(0, 8);
    safeName = safeName.substring(0, 120) + `_${hash}`;
  }
  
  return safeName;
}

function applyRules(content: string): string {
  let processed = content;
  
  // Rule 1: Only markup, no content changes
  // (Handled by LLM provider)
  
  // Rule 2: Skip conventional names (products/companies/time/individual names)
  if (PROCESSING_RULES.SKIP_CONVENTIONAL_NAMES) {
    processed = processed.replace(
      /\[\[(?:[A-Z][a-z]+(?: [A-Z][a-z]+)*|[\d]{4}s?)\]\]/g,
      ''
    );
  }
  
  // Rule 3: Output full content (preserved by default)
  
  // Rule 4: Remove duplicate concepts
  if (PROCESSING_RULES.REMOVE_DUPLICATES) {
    const seen = new Set<string>();
    processed = processed.replace(/\[\[([^\[\]]+)\]\]/g, (match, keyword) => {
      const normalized = normalizeKeyword(keyword);
      return seen.has(normalized) ? keyword : (seen.add(normalized), match);
    });
  }
  
  // Rule 5: Ignore references
  if (PROCESSING_RULES.IGNORE_REFERENCES) {
    processed = processed.replace(/\[\[(?:@|https?:\/\/)[^\[\]]+\]\]/g, '');
  }
  
  return processed;
}
