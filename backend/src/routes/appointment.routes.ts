import { Router } from 'express';
import { createAppointment, listAppointments, getAppointment, cancelAppointment, updateAppointmentStatus } from '../controllers/appointment.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.get('/', listAppointments);
router.post('/', requireRole(['USER']), createAppointment);
router.get('/:id', getAppointment);
router.post('/:id/cancel', cancelAppointment);
router.patch('/:id/status', requireRole(['SERVICE_PROVIDER', 'ADMIN']), updateAppointmentStatus);
export default router;
