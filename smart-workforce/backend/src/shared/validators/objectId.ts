import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

export const objectIdString = z.string().refine(isValidObjectId, { message: 'Invalid id format' });
