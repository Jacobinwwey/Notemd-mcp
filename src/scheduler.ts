import { logger } from './index.js';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { processMarkdown } from './processors/markdown.js';

export function scheduleWithTimeout<T>(
  fn: () => Promise<T>, 
  timeoutMs: number,
  onTimeout?: () => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (onTimeout) onTimeout();
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

interface SchedulerConfig {
  inputDir: string;
  outputDir: string;
  schedule?: string;
  provider?: string;
  intensity?: number;
  timeoutHours?: number;
}

export class TaskScheduler {
  private config: SchedulerConfig;

  constructor(config: SchedulerConfig) {
    this.config = {
      schedule: '0 * * * *', // Default: hourly
      provider: 'deepseek',
      intensity: 1,
      timeoutHours: 8,
      ...config
    };
  }

  async start() {
    // Initial run
    await this.runProcessing();

    // Scheduled runs
    if (this.config.schedule) {
      cron.schedule(this.config.schedule, async () => {
        await this.runProcessing();
      });
    }
  }

  private async runProcessing() {
    try {
      logger.info(`Starting scheduled processing run`);
      
      const files = await fs.readdir(this.config.inputDir);
      const mdFiles = files.filter((f: string) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const content = await fs.readFile(
          path.join(this.config.inputDir, file), 
          'utf-8'
        );

        if (!this.config.provider || !this.config.intensity || !this.config.timeoutHours) {
          throw new Error('Missing required configuration');
        }

        await scheduleWithTimeout(
          () => processMarkdown(content, {
            providerName: this.config.provider!,
            intensity: this.config.intensity!,
            outputPath: this.config.outputDir,
            timeoutHours: this.config.timeoutHours!
          }),
          this.config.timeoutHours * 3600 * 1000,
          () => logger.warn(`Processing timed out for ${file}`)
        );
      }

      logger.info(`Completed processing ${mdFiles.length} files`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        logger.error(`Scheduled processing failed: ${err.message}`);
      } else {
        logger.error(`Scheduled processing failed with unknown error`);
      }
    }
  }
}
