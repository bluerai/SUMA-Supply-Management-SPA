import { Router } from 'express';

import {
  startAction, categoryAction, getHeadAction, getDetailsAction, newProductAction, newCategoryAction, updateAction, renameAction, 
  deleteAction, evalAction, healthAction, dbAction } from './controller.js';

const router = Router();

router.get('/', startAction);
router.get('/category/:id', categoryAction);
router.get('/head/:id', getHeadAction);
router.get('/details/:id', getDetailsAction);
router.get('/new/:cat/:nam', newProductAction);
router.get('/new/:nam', newCategoryAction);
router.post('/upd', updateAction);
router.get('/del/:id', deleteAction);
router.get('/nam/:id/:nam', renameAction);
router.get('/eval', evalAction);
router.get('/health', healthAction);

router.get('/connectdb', dbAction);
router.get('/unconnectdb', dbAction);

export { router };