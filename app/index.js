'use strict'

import { Router } from 'express';

import {
  startAction, getAllHeadsAction, getDetailsAction, getCategoryAction, getNextCategoryAction, 
  getPrevCategoryAction, getCategoryListAction, renameCategoryAction, createCategoryAction, 
  deleteCategoryAction, toggleCategoryStarAction, updateProductAction, moveProductAction,
  createProductAction, deleteProductAction, updateAction, getProdDataAction
} from './controller.js';

export const appRouter = Router();

appRouter.get('/', startAction);
appRouter.get('/list/:func', getCategoryListAction);
appRouter.get('/get/:id?', getCategoryAction);
appRouter.get('/next/:id', getNextCategoryAction);
appRouter.get('/prev/:id', getPrevCategoryAction);
appRouter.get('/move/:prodid/:catid', moveProductAction);

appRouter.get('/cat/star/:id', toggleCategoryStarAction);
appRouter.get('/cat/del/:id', deleteCategoryAction);
appRouter.get('/cat/:nam/:id', renameCategoryAction);
appRouter.get('/cat/:nam', createCategoryAction);

appRouter.get('/heads/:id/:sort?', getAllHeadsAction);
appRouter.get('/proddata/:id', getProdDataAction);
appRouter.get('/details/:id', getDetailsAction);
appRouter.get('/pro/del/:id', deleteProductAction);
appRouter.post('/pro/upd/:id', updateProductAction);
appRouter.post('/pro/:catid', createProductAction);

appRouter.post('/upd', updateAction);

