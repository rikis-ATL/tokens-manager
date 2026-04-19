import TokenCollection from '../TokenCollection';

describe('TokenCollection model — organizationId extension (Phase 22)', () => {
  it('has an organizationId path', () => {
    expect(TokenCollection.schema.path('organizationId')).toBeDefined();
  });

  it('organizationId is an ObjectId', () => {
    // Mongoose returns 'ObjectId' (lowercase d) in this version
    expect(TokenCollection.schema.path('organizationId').instance).toBe('ObjectId');
  });

  it('organizationId references the Organization model', () => {
    const opts = (TokenCollection.schema.path('organizationId') as { options: { ref?: string } }).options;
    expect(opts.ref).toBe('Organization');
  });

  it('organizationId is required (D-02)', () => {
    expect(TokenCollection.schema.path('organizationId').isRequired).toBe(true);
  });

  it('has compound index (organizationId, _id)', () => {
    const indexes = TokenCollection.schema.indexes();
    const hasCompound = indexes.some(([fields]) =>
      (fields as Record<string, number>).organizationId === 1 &&
      (fields as Record<string, number>)._id === 1
    );
    expect(hasCompound).toBe(true);
  });

  it('preserves existing name index', () => {
    const indexes = TokenCollection.schema.indexes();
    const hasName = indexes.some(([fields]) => (fields as Record<string, number>).name === 1);
    expect(hasName).toBe(true);
  });

  it('preserves existing fields (regression)', () => {
    expect(TokenCollection.schema.path('tokens')).toBeDefined();
    expect(TokenCollection.schema.path('themes')).toBeDefined();
    expect(TokenCollection.schema.path('graphState')).toBeDefined();
    expect(TokenCollection.schema.path('isPlayground')).toBeDefined();
  });
});
