
import { logger } from './log.js'

try {
  const response = await fetch("http://localhost:" + process.env.PORT + "/app/health/");
  const data = await response.json();

  if (data.healthy === true) {
    logger.debug('Healthy response received: ' + JSON.stringify(data));
    process.exit(0);
  }

  logger.warn('Unhealthy response received: ' + JSON.stringify(data));
  process.exit(1);

} catch (error) {
  logger.error('Error parsing JSON response body: ' + JSON.stringify(data));
  process.exit(1);
}
