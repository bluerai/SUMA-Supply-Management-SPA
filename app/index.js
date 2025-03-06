'use strict'

import { Router } from 'express';

import {
  startAction, getAllHeadsAction, getDetailsAction, getCategoryAction, getCategoryListAction,
  renameCategoryAction, createCategoryAction, deleteCategoryAction, toggleCategoryStarAction,
  renameProductAction, createProductAction, deleteProductAction,
  updateAction
} from './controller.js';

export const appRouter = Router();

appRouter.get('/', startAction);
appRouter.get('/get/:id?', getCategoryAction);
appRouter.get('/list', getCategoryListAction);
appRouter.get('/heads/:id', getAllHeadsAction);
appRouter.get('/details/:id', getDetailsAction);

appRouter.get('/cat/star/:id', toggleCategoryStarAction);
appRouter.get('/cat/del/:id', deleteCategoryAction);
appRouter.get('/cat/:nam/:id', renameCategoryAction);
appRouter.get('/cat/:nam', createCategoryAction);

appRouter.get('/pro/del/:id', deleteProductAction);
appRouter.get('/pro/:catid/:nam/:id', renameProductAction);
appRouter.get('/pro/:catid/:nam', createProductAction);

appRouter.post('/upd', updateAction);

