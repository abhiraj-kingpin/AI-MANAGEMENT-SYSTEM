import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as geofenceController from './geofence.controller';
import {
  createGeofenceSchema,
  nearbyQuerySchema,
  updateGeofenceSchema,
} from './geofence.validators';

const router = Router();

// Office-location management — Super Admin/HR only, per
// docs/architecture/04-api-documentation.md#gps--geofence-geofences.
router.use(authenticate, requireRole('super_admin', 'hr'));

router.get('/nearby', validate(nearbyQuerySchema), geofenceController.nearbyGeofences);
router.get('/', geofenceController.listGeofences);
router.post('/', validate(createGeofenceSchema), geofenceController.createGeofence);
router.patch('/:id', validate(updateGeofenceSchema), geofenceController.updateGeofence);
router.delete('/:id', geofenceController.deactivateGeofence);

export { router as geofenceRouter };
