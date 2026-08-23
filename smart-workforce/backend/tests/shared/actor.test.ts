import type { Request } from 'express';
import { actorFromRequest, requireEmployeeId } from '../../src/shared/utils/actor';
import type { ActorContext } from '../../src/shared/types/actorContext';

describe('actorFromRequest', () => {
  it('reads id/role/employeeId off req.user', () => {
    const req = { user: { id: 'user-1', role: 'hr', employeeId: 'emp-1' } } as unknown as Request;
    expect(actorFromRequest(req)).toEqual({ id: 'user-1', role: 'hr', employeeId: 'emp-1' });
  });

  it('carries an undefined employeeId through as-is (not linked to an employee profile)', () => {
    const req = { user: { id: 'user-x', role: 'hr' } } as unknown as Request;
    expect(actorFromRequest(req)).toEqual({ id: 'user-x', role: 'hr', employeeId: undefined });
  });
});

describe('requireEmployeeId', () => {
  it("returns the actor's employeeId when linked", () => {
    const actor: ActorContext = { id: 'user-1', role: 'employee', employeeId: 'emp-1' };
    expect(requireEmployeeId(actor)).toBe('emp-1');
  });

  it('throws NO_EMPLOYEE_PROFILE when the actor has no linked employee', () => {
    const actor: ActorContext = { id: 'user-x', role: 'employee' };
    expect(() => requireEmployeeId(actor)).toThrow(
      expect.objectContaining({ code: 'NO_EMPLOYEE_PROFILE' }),
    );
  });
});
