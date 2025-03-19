'use strict'

import { Router } from 'express';

import {
  startAction, getAllHeadsAction, getDetailsAction, getCategoryAction, getNextCategoryAction, 
  getPrevCategoryAction, getCategoryListAction, renameCategoryAction, createCategoryAction, 
  deleteCategoryAction, toggleCategoryStarAction, renameProductAction, moveProductAction,
  createProductAction, deleteProductAction, updateAction
} from './controller.js';

export const appRouter = Router();

appRouter.get('/', startAction);
appRouter.get('/get/:id?', getCategoryAction);
appRouter.get('/next/:id', getNextCategoryAction);
appRouter.get('/prev/:id', getPrevCategoryAction);
appRouter.get('/list/:func', getCategoryListAction);
appRouter.get('/heads/:id', getAllHeadsAction);
appRouter.get('/heads/:id/:sort', getAllHeadsAction);
appRouter.get('/details/:id', getDetailsAction);

appRouter.get('/cat/star/:id', toggleCategoryStarAction);
appRouter.get('/cat/del/:id', deleteCategoryAction);
appRouter.get('/cat/:nam/:id', renameCategoryAction);
appRouter.get('/cat/:nam', createCategoryAction);
appRouter.get('/move/:prodid/:catid', moveProductAction);

appRouter.get('/pro/del/:id', deleteProductAction);
appRouter.get('/pro/:catid/:nam/:id', renameProductAction);
appRouter.get('/pro/:catid/:nam', createProductAction);

appRouter.post('/upd', updateAction);

