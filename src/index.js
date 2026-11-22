import { config } from './config.js';
import { createLogger } from './logger.js';
import { createServer } from './server.js';
import { createProxy } from './proxy.js';
import { createScheduler } from './scheduler.js';

const logger = createLogger(config.logLevel);
const proxy = createProxy({ segmentCacheMax: config.segmentCacheMax, userAgent: config.userAgent, logger });
const scheduler = createScheduler({ config, logger });
const app = createServer({ config, proxy, logger, scheduler });

app.listen(config.port, () => {
  logger.info(`listening on ${config.port}`);
  scheduler.start();
});
