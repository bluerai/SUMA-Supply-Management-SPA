import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { router as sumaRouter } from './suma/index.js';
import { logger } from './log.js'


const app = express();

app.set('view engine', 'pug');

app.use(express.static(dirname(fileURLToPath(import.meta.url)) + '/public'));

app.use(express.urlencoded({ extended: false }));

app.use('/suma', sumaRouter);

app.get('/', (request, response) => response.redirect('/suma'));

app.listen(process.env.PORT, () => {
  logger.info('Server is listening to Port ' + process.env.PORT);
});
