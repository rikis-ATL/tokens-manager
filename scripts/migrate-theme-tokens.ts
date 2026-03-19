/**
 * Migration: seed theme.tokens on pre-existing theme documents.
 *
 * Run via: npm run migrate:themes
 * Idempotent: themes that already have a tokens field are skipped (not overwritten).
 *
 * Environment: requires MONGODB_URI in .env.local (loaded via -r dotenv/config in npm script).
 */
import dbConnect from '../src/lib/mongodb';
import TokenCollection from '../src/lib/db/models/TokenCollection';
import { tokenService } from '../src/services/token.service';

async function migrate() {
  await dbConnect();

  // Only fetch collections that have at least one theme
  const collections = await TokenCollection.find({
    'themes.0': { $exists: true },
  }).lean();

  let migratedCount = 0;

  for (const col of collections) {
    const rawTokens = (col.tokens as Record<string, unknown>) ?? {};
    const { groups: groupTree } = tokenService.processImportedTokens(rawTokens, '');

    const themes = ((col.themes as unknown) as Array<Record<string, unknown>>) ?? [];
    const needsMigration = themes.some(
      (t) => t.tokens === undefined || t.tokens === null
    );

    if (!needsMigration) continue;

    // Rebuild array — skip themes that already have tokens (idempotency)
    const updatedThemes = themes.map((t) => {
      if (t.tokens !== undefined && t.tokens !== null) return t;
      migratedCount++;
      console.log(`  Migrated theme '${String(t.name)}': ${groupTree.length} top-level groups seeded`);
      return { ...t, tokens: groupTree };
    });

    // Whole-array $set — positional $set on Mixed-typed arrays is unreliable (Mongoose #14595, #12530)
    await TokenCollection.findByIdAndUpdate(col._id, {
      $set: { themes: updatedThemes },
    });
  }

  console.log(`\nMigration complete. ${migratedCount} theme(s) updated.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
