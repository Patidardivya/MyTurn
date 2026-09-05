import { Router } from 'express';
import { getMetrics, approveProvider, getAuditLogs } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth, requireRole(['ADMIN']));

router.get('/metrics', getMetrics);
router.post('/providers/:id/approve', approveProvider);
router.get('/audit-logs', getAuditLogs);

export default router;
