import { Router } from 'express';
import { getQueueLive, callNext, recallTicket, skipTicket, listQueues, createQueue } from '../controllers/queue.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, requireRole(['ADMIN', 'SERVICE_PROVIDER']), listQueues);
router.post('/', requireAuth, requireRole(['ADMIN']), createQueue);

// Used by provider and public display
router.get('/:id/live', getQueueLive);

// Provider only
router.post('/:id/call-next', requireAuth, requireRole(['SERVICE_PROVIDER', 'ADMIN']), callNext);
router.post('/:id/recall', requireAuth, requireRole(['SERVICE_PROVIDER', 'ADMIN']), recallTicket);
router.post('/:id/skip', requireAuth, requireRole(['SERVICE_PROVIDER', 'ADMIN']), skipTicket);

export default router;
