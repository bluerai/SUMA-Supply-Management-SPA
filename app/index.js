import { Router } from 'express';

import {
  startAction, getHeadAction, getDetailsAction, getCategoryAction, getCategoryListAction,
  renameCategoryAction, createCategoryAction, deleteCategoryAction, toggleCategoryStarAction,
  renameProductAction, createProductAction, deleteProductAction,
  updateAction, evalAction, healthAction, dbAction
} from './controller.js';

const router = Router();

router.get('/', startAction);
router.get('/get/:id/:tok', getCategoryAction);
router.get('/list/:tok', getCategoryListAction);
router.get('/head/:id/:tok', getHeadAction);
router.get('/details/:id/:tok', getDetailsAction);

router.get('/cat/star/:id/:tok', toggleCategoryStarAction);
router.get('/cat/del/:id/:tok', deleteCategoryAction);
router.get('/cat/:nam/:id/:tok', renameCategoryAction);
router.get('/cat/:nam/:tok', createCategoryAction);

router.get('/pro/del/:id/:tok', deleteProductAction);
router.get('/pro/:catid/:nam/:id/:tok', renameProductAction);
router.get('/pro/:catid/:nam/:tok', createProductAction);

router.post('/upd/:tok', updateAction);

router.get('/eval/', evalAction);
router.get('/health/', healthAction);
router.get('/connectdb/:tok', dbAction);
router.get('/unconnectdb/:tok', dbAction);


export { router };