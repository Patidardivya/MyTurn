import { Router } from 'express';
import { createTicket, getTicketStatus, cancelTicket, transferTicket, completeTicket, noShowTicket } from '../controllers/ticket.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/', requireAuth, createTicket);
router.get('/:id/status', requireAuth, getTicketStatus);
router.post('/:id/cancel', requireAuth, cancelTicket);

// Provider only routes for a specific ticket
router.post('/:id/transfer', requireAuth, requireRole(['SERVICE_PROVIDER', 'ADMIN']), transferTicket);
router.post('/:id/complete', requireAuth, requireRole(['SERVICE_PROVIDER', 'ADMIN']), completeTicket);
router.post('/:id/no-show', requireAuth, requireRole(['SERVICE_PROVIDER', 'ADMIN']), noShowTicket);

export default router;
