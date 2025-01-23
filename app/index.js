import { Router } from 'express';

import {
  startAction, getHeadAction, getDetailsAction, getCategoryAction, getCategoryListAction,
  renameCategoryAction, createCategoryAction, deleteCategoryAction, toggleCategoryStarAction,
  renameProductAction, createProductAction, deleteProductAction,
  updateAction, evalAction, healthAction, dbAction
} from './controller.js';

const router = Router();

router.get('/', startAction);
router.get('/get/:id', getCategoryAction);
router.get('/list', getCategoryListAction);
router.get('/head/:id', getHeadAction);
router.get('/details/:id', getDetailsAction);

router.get('/cat/star/:id', toggleCategoryStarAction);
router.get('/cat/del/:id', deleteCategoryAction);
router.get('/cat/:nam/:id', renameCategoryAction);
router.get('/cat/:nam/', createCategoryAction);

router.get('/pro/del/:id', deleteProductAction);
router.get('/pro/:catid/:nam/:id', renameProductAction);
router.get('/pro/:catid/:nam', createProductAction);

router.post('/upd', updateAction);
router.get('/eval', evalAction);
router.get('/health', healthAction);

router.get('/connectdb', dbAction);
router.get('/unconnectdb', dbAction);

export { router };