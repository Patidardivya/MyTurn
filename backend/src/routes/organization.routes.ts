import { Router } from 'express';
import { listOrganizations, getOrganization, createOrganization, updateOrganization } from '../controllers/organization.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.get('/', listOrganizations);
router.get('/:id', getOrganization);
router.post('/', requireAuth, requireRole(['ADMIN']), createOrganization);
router.patch('/:id', requireAuth, requireRole(['ADMIN']), updateOrganization);
export default router;
