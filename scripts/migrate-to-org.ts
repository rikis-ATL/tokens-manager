// scripts/migrate-to-org.ts
// Phase 22 TENANT-03 — One-off migration: seed initial Organization + back-fill organizationId
// on existing User and TokenCollection documents.
//
// Run order (Pitfall 3):
//   1. Run this script against target DB (dev, staging, prod) BEFORE deploying Plan 01's code.
//   2. Confirm every User and TokenCollection has organizationId via mongosh.
//   3. Deploy Plan 01's code with `required: true`.
//
// Idempotency (D-13): If any Organization already exists, the script exits 0 without changes.
// Safe to re-run after initial migration.
//
// Invocation (matches scripts/seed.ts pattern):
//   DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config \
//     --project tsconfig.scripts.json scripts/migrate-to-org.ts
//
// NEVER imported by app code (D-11). This file lives in scripts/ and is only invoked manually.

import dbConnect from '../src/lib/mongodb';
// IMPORTANT (Pitfall 4): Import the model modules — do NOT use mongoose.models['TokenCollection']
// because TokenCollection uses a dynamic model key TokenCollection_${MONGODB_COLLECTION_NAME}.
import Organization from '../src/lib/db/models/Organization';
import User from '../src/lib/db/models/User';
import TokenCollection from '../src/lib/db/models/TokenCollection';

export async function migrate(): Promise<{ orgId: string; usersUpdated: number; collectionsUpdated: number } | null> {
  await dbConnect();

  // D-13 — Idempotency guard. Any existing Organization means a previous run already seeded.
  const orgCount = await Organization.countDocuments();
  if (orgCount > 0) {
    console.log(`[migrate-to-org] ${orgCount} Organization document(s) already exist — skipping migration.`);
    return null;
  }

  // D-12 — Seed the initial Organization.
  const orgName = process.env.INITIAL_ORG_NAME ?? 'Default Organization';
  const org = await Organization.create({ name: orgName });
  const orgId = String(org._id);
  console.log(`[migrate-to-org] Created Organization: ${orgId} (name: "${orgName}")`);

  // D-12 — Back-fill existing User docs that lack organizationId.
  const userResult = await User.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: org._id } }
  );
  const usersUpdated = (userResult as { modifiedCount?: number }).modifiedCount ?? 0;
  console.log(`[migrate-to-org] Back-filled organizationId on ${usersUpdated} User document(s).`);

  // D-12 — Back-fill existing TokenCollection docs that lack organizationId.
  const collResult = await TokenCollection.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: org._id } }
  );
  const collectionsUpdated = (collResult as { modifiedCount?: number }).modifiedCount ?? 0;
  console.log(`[migrate-to-org] Back-filled organizationId on ${collectionsUpdated} TokenCollection document(s).`);

  console.log('');
  console.log(`[migrate-to-org] SUCCESS. Set the following in .env.local for demo mode (Plan 02):`);
  console.log(`  DEMO_ORG_ID=${orgId}`);
  console.log('');
  return { orgId, usersUpdated, collectionsUpdated };
}

// Only run when invoked directly (allows the test file to import `migrate` without triggering exit).
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate-to-org] FAILED:', err);
      process.exit(1);
    });
}
