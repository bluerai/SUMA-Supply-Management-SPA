import { Router } from 'express';

import {
  startAction, getHeadAction, getAllHeadsAction, getDetailsAction, getCategoryAction, getCategoryListAction,
  renameCategoryAction, createCategoryAction, deleteCategoryAction, toggleCategoryStarAction,
  renameProductAction, createProductAction, deleteProductAction,
  updateAction
} from './controller.js';

export const appRouter = Router();

appRouter.get('/', startAction);
appRouter.get('/get/:id/:tok', getCategoryAction);
appRouter.get('/list/:tok', getCategoryListAction);
appRouter.get('/head/:id/:tok', getHeadAction);
appRouter.get('/heads/:id/:tok', getAllHeadsAction);
appRouter.get('/details/:id/:tok', getDetailsAction);

appRouter.get('/cat/star/:id/:tok', toggleCategoryStarAction);
appRouter.get('/cat/del/:id/:tok', deleteCategoryAction);
appRouter.get('/cat/:nam/:id/:tok', renameCategoryAction);
appRouter.get('/cat/:nam/:tok', createCategoryAction);

appRouter.get('/pro/del/:id/:tok', deleteProductAction);
appRouter.get('/pro/:catid/:nam/:id/:tok', renameProductAction);
appRouter.get('/pro/:catid/:nam/:tok', createProductAction);

appRouter.post('/upd/:tok', updateAction);

