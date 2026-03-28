import dbConnect from '@/lib/mongodb';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import User from '@/lib/db/models/User';

// Module-level flag to skip DB check after first successful run in same process
let bootstrapComplete = false;

/**
 * Backfill CollectionPermission grants for all existing collections, assigning the
 * first Admin as owner (role: 'Admin') of every collection.
 *
 * Idempotent: exits immediately if any CollectionPermission records already exist,
 * or if the module-level flag was set by a previous call in this process.
 *
 * Call this at app startup (e.g., from the collections list route handler) to ensure
 * pre-RBAC collections are accessible to the Admin after Phase 19 is deployed.
 */
export async function bootstrapCollectionGrants(): Promise<void> {
  if (bootstrapComplete) return;

  await dbConnect();

  const existingCount = await CollectionPermission.countDocuments();
  if (existingCount > 0) {
    bootstrapComplete = true;
    return;
  }

  const admin = await User.findOne({ role: 'Admin' }).sort({ createdAt: 1 }).lean();
  if (!admin) return; // no admin yet (pre-setup state)

  // Dynamic import to avoid potential circular dependency with TokenCollection model
  const { default: TokenCollection } = await import('@/lib/db/models/TokenCollection');
  const collections = await TokenCollection.find({}, '_id').lean();
  if (collections.length === 0) {
    bootstrapComplete = true;
    return;
  }

  const grants = collections.map(c => ({
    userId: admin._id.toString(),
    collectionId: c._id.toString(),
    role: 'Admin' as const,
  }));

  await CollectionPermission.insertMany(grants, { ordered: false });
  bootstrapComplete = true;
}
