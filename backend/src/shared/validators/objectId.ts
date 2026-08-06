import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

/** A string that parses as a valid Mongo ObjectId — for `departmentId`, `managerId`, etc. in request bodies. */
export const objectIdString = z.string().refine(isValidObjectId, { message: 'Invalid id format' });
