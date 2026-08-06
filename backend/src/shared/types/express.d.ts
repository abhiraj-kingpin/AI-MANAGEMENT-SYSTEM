import type { Role } from '../constants/roles';

declare global {
  namespace Express {
    interface Request {
      /** Set by `middlewares/auth.middleware.ts` after verifying the access token. */
      user?: {
        id: string;
        role: Role;
        employeeId?: string;
      };
      /**
       * Set by `middlewares/validate.middleware.ts` — the coerced/defaulted
       * output of the route's Zod schema. Read `req.validated.query`/`.params`
       * from here rather than `req.query`/`req.params` directly: `req.query`
       * is a getter-only property in Express 5, so overwriting it in place
       * isn't an option, and raw `req.query` values are always strings
       * (no `z.coerce`/`.default()` applied).
       */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
