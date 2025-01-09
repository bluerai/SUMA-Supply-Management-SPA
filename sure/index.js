import { Router } from 'express';

import {
  startAction, categoryAction, getHeadAction, getDetailsAction, newProductAction, newCategoryAction, updateAction, renameAction,
  deleteProductAction, deleteCategoryAction, evalAction, healthAction, dbAction
} from './controller.js';

const router = Router();

router.get('/', startAction);
router.get('/head/:id', getHeadAction);
router.get('/details/:id', getDetailsAction);
router.get('/category/:id', categoryAction);

router.get('/pro/:nam/:catid', newProductAction);
router.get('/cat/:nam/:id?', newCategoryAction);
router.post('/upd', updateAction);

router.get('/del/pro/:id', deleteProductAction); 
router.get('/del/cat/:id', deleteCategoryAction);
router.get('/nam/:id/:nam', renameAction);
router.get('/eval', evalAction);
router.get('/health', healthAction);

router.get('/connectdb', dbAction);
router.get('/unconnectdb', dbAction);

export { router };