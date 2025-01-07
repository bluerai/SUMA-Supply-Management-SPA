import { Router } from 'express';

import { startAction, getHeadAction, getDetailsAction, newAction, updateAction, renameAction, 
  deleteAction, evalAction, healthAction, dbAction } from './controller.js';

const router = Router();

router.get('/', startAction);
router.get('/head/:id', getHeadAction);
router.get('/details/:id', getDetailsAction);
router.get('/new/:nam', newAction);
router.post('/upd', updateAction);
router.get('/del/:id', deleteAction);
router.get('/nam/:id/:nam', renameAction);
router.get('/eval', evalAction);
router.get('/health', healthAction);

router.get('/connectdb', dbAction);
router.get('/unconnectdb', dbAction);

export { router };