import { Router } from 'express';
import { getProviderAnalytics } from '../controllers/analytics.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/provider', requireAuth, requireRole(['SERVICE_PROVIDER', 'ADMIN']), getProviderAnalytics);

export default router;
