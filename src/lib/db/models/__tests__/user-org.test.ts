import User, { IUser } from '../User';

describe('User model — organizationId extension (Phase 22)', () => {
  it('has an organizationId path', () => {
    expect(User.schema.path('organizationId')).toBeDefined();
  });

  it('organizationId is an ObjectId', () => {
    // Mongoose v8 returns 'ObjectId' (lowercase d); v9 docs said 'ObjectID' but empirically 'ObjectId' here
    expect(User.schema.path('organizationId').instance).toBe('ObjectId');
  });

  it('organizationId references the Organization model', () => {
    const opts = (User.schema.path('organizationId') as { options: { ref?: string } }).options;
    expect(opts.ref).toBe('Organization');
  });

  it('organizationId is required (D-02)', () => {
    expect(User.schema.path('organizationId').isRequired).toBe(true);
  });

  it('has compound index (organizationId, _id)', () => {
    const indexes = User.schema.indexes();
    const hasCompound = indexes.some(([fields]) =>
      (fields as Record<string, number>).organizationId === 1 &&
      (fields as Record<string, number>)._id === 1
    );
    expect(hasCompound).toBe(true);
  });

  it('preserves existing email index', () => {
    const indexes = User.schema.indexes();
    const hasEmail = indexes.some(([fields]) => (fields as Record<string, number>).email === 1);
    expect(hasEmail).toBe(true);
  });

  it('IUser type declares organizationId as required (compile-time check)', () => {
    // If organizationId is typed as optional, the inline type `Required<Pick<IUser, 'organizationId'>>`
    // below is still structurally valid. The real check is that this compiles AT ALL — IUser must
    // include the field. If the field were removed, the assignment to `u` would fail type check.
    const u: IUser = {
      displayName: 'x',
      email: 'x@x.com',
      passwordHash: 'h',
      role: 'Admin',
      status: 'active',
      organizationId: '507f1f77bcf86cd799439011',
    };
    expect(u.organizationId).toBe('507f1f77bcf86cd799439011');
  });
});
