import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { router as sureRouter } from './sure/index.js';


const app = express();

app.set('view engine', 'pug');

app.use(express.static(dirname(fileURLToPath(import.meta.url)) + '/public'));

app.use(express.urlencoded({ extended: false }));

app.use('/sure', sureRouter);

app.get('/', (request, response) => response.redirect('/sure'));

app.listen(process.env.PORT, () => {
  console.log(new Date().toLocaleString('de') + ' - Server is listening to Port ' + process.env.PORT);
});
