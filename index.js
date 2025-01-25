import express from 'express';
import { router } from './app/index.js';
import { logger } from './log.js'


const app = express();

app.set('view engine', 'pug');

app.use(express.static(import.meta.dirname  + '/public'));

app.use(express.urlencoded({extended: false}));

app.use(express.json());

app.use('/app', router);

app.use((request, response) => response.redirect('/app'));

app.listen(process.env.PORT, () => {
  logger.info('Server is listening to Port ' + process.env.PORT);
});
