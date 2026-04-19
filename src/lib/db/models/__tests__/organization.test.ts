import mongoose from 'mongoose';
import Organization from '../Organization';

describe('Organization model', () => {
  afterAll(() => {
    // Clear the model registry so re-runs do not leak state
    mongoose.deleteModel(/Organization/);
  });

  it('registers under the static key "Organization"', () => {
    expect(Organization.modelName).toBe('Organization');
  });

  it('requires name as a String', () => {
    const namePath = Organization.schema.path('name');
    expect(namePath).toBeDefined();
    expect(namePath.instance).toBe('String');
    expect(namePath.isRequired).toBe(true);
  });

  it('enables timestamps (createdAt, updatedAt)', () => {
    expect(Organization.schema.path('createdAt')).toBeDefined();
    expect(Organization.schema.path('updatedAt')).toBeDefined();
  });

  it('does not include slug, ownerId, or planTier (minimal schema D-01)', () => {
    expect(Organization.schema.path('slug')).toBeUndefined();
    expect(Organization.schema.path('ownerId')).toBeUndefined();
    expect(Organization.schema.path('planTier')).toBeUndefined();
  });

  it('guards against double-registration', () => {
    // Re-importing should return the cached model, not throw OverwriteModelError
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const again = require('../Organization').default;
      expect(again.modelName).toBe('Organization');
    });
  });
});
