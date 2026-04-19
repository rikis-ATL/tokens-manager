// src/lib/auth/assert-org-ownership.ts
// Phase 22 — Multi-tenant ownership guard. Call AFTER requireAuth() and BEFORE business logic.
//
// Signature per CONTEXT.md D-07:
//   assertOrgOwnership(session: Session, collectionId: string): Promise<NextResponse | null>
//   - returns null on success (caller proceeds)
//   - returns NextResponse 404 on any failure mode
//
// Every failure mode returns an identical `{ error: 'Not Found' }` body with status 404
// (D-07). A cross-tenant attacker cannot distinguish "collection does not exist" from
// "collection exists in another org" — the response is byte-identical.

import type { Session } from 'next-auth';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';

const NOT_FOUND = () => NextResponse.json({ error: 'Not Found' }, { status: 404 });

/**
 * Assert that the authenticated session's organizationId matches the collection's organizationId.
 *
 * @param session   The validated Session from requireAuth() — NOT raw user input.
 * @param collectionId The _id of the TokenCollection being accessed. Empty strings are rejected (Pitfall 6).
 * @returns null on ownership match; NextResponse 404 on any failure (no session claim, no collection, or mismatch).
 */
export async function assertOrgOwnership(
  session: Session,
  collectionId: string
): Promise<NextResponse | null> {
  // Pitfall 6 — reject empty/whitespace IDs to avoid accidental wildcard matches.
  if (!collectionId || !collectionId.trim()) {
    return NOT_FOUND();
  }

  const sessionOrgId = session.user.organizationId;
  // Pitfall 1 — pre-migration JWTs do not carry organizationId. Treat as mismatch.
  if (!sessionOrgId) {
    return NOT_FOUND();
  }

  await dbConnect();
  const collection = await TokenCollection.findById(collectionId)
    .select('organizationId')
    .lean() as { organizationId?: unknown } | null;

  if (!collection) {
    return NOT_FOUND();
  }

  // Pitfall 2 — collection.organizationId is a Mongoose ObjectId; sessionOrgId is a string.
  // Use String() coercion so the comparison is consistent regardless of input shape.
  if (String(collection.organizationId ?? '') !== sessionOrgId) {
    return NOT_FOUND();
  }

  return null; // ownership confirmed
}
