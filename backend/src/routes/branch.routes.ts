import { Router } from 'express';
import { listBranches, getBranch, createBranch, updateBranch } from '../controllers/branch.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.get('/', listBranches);
router.get('/:id', getBranch);
router.post('/', requireAuth, requireRole(['ADMIN']), createBranch);
router.patch('/:id', requireAuth, requireRole(['ADMIN']), updateBranch);
export default router;
