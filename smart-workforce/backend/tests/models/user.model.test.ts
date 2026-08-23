import { User } from '../../src/modules/users/user.model';

describe('User model validation', () => {
  it('accepts a well-formed document', () => {
    const user = new User({
      email: 'jane@acme.com',
      passwordHash: 'already-hashed',
      role: 'employee',
    });

    expect(user.validateSync()).toBeUndefined();
  });

  it('rejects an invalid email', () => {
    const user = new User({ email: 'not-an-email', passwordHash: 'x', role: 'employee' });

    const error = user.validateSync();
    expect(error?.errors.email).toBeDefined();
  });

  it('rejects a role outside the enum', () => {
    const user = new User({
      email: 'jane@acme.com',
      passwordHash: 'x',
      role: 'ceo',
    });

    const error = user.validateSync();
    expect(error?.errors.role).toBeDefined();
  });

  it('requires passwordHash', () => {
    const user = new User({ email: 'jane@acme.com', role: 'employee' });

    const error = user.validateSync();
    expect(error?.errors.passwordHash).toBeDefined();
  });

  it('hashes and compares a password via the model helpers', async () => {
    const hash = await User.hashPassword('correct-horse-battery-staple');
    const user = new User({ email: 'jane@acme.com', passwordHash: hash, role: 'employee' });

    await expect(user.comparePassword('correct-horse-battery-staple')).resolves.toBe(true);
    await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
  });
});
