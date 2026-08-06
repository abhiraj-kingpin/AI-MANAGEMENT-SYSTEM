import { sendSuccess } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { geofenceService } from './geofence.service';
import type { NearbyQuery } from './geofence.validators';

export const createGeofence = asyncHandler(async (req, res) => {
  const geofence = await geofenceService.createGeofence(req.body);
  sendSuccess(res, { geofence }, 201);
});

export const listGeofences = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const geofences = await geofenceService.listGeofences(includeInactive);
  sendSuccess(res, geofences);
});

export const updateGeofence = asyncHandler(async (req, res) => {
  const geofence = await geofenceService.updateGeofence(req.params.id, req.body);
  sendSuccess(res, { geofence });
});

export const deactivateGeofence = asyncHandler(async (req, res) => {
  await geofenceService.deactivateGeofence(req.params.id);
  sendSuccess(res, { status: 'ok' });
});

export const nearbyGeofences = asyncHandler(async (req, res) => {
  const { lat, lng } = req.validated!.query as NearbyQuery;
  const results = await geofenceService.nearby(lat, lng);
  sendSuccess(res, results);
});
