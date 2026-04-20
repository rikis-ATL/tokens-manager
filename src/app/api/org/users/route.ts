import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import { getRepository } from '@/lib/db/get-repository';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function GET() {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  await dbConnect();

  const orgId = authResult.user.organizationId;

  const [users, collections] = await Promise.all([
    User.find({ status: { $ne: 'disabled' }, organizationId: orgId })
      .select('displayName email role status createdAt')
      .sort({ createdAt: 1 })
      .lean() as Promise<Array<{
        _id: { toString(): string };
        displayName: string;
        email: string;
        role: string;
        status: string;
        createdAt: Date;
      }>>,
    getRepository().then((r) => r.list({ organizationId: orgId })),
  ]);

  const orgCollectionIds = new Set(collections.map((c) => c._id.toString()));
  const grants = await CollectionPermission.find({ collectionId: { $in: [...orgCollectionIds] } }).lean();

  const collectionNameMap = new Map(collections.map((c) => [c._id, c.name]));

  // Group grants by userId
  const grantsByUser = new Map<string, { id: string; name: string }[]>();
  for (const g of grants) {
    const uid = g.userId;
    if (!grantsByUser.has(uid)) grantsByUser.set(uid, []);
    const name = collectionNameMap.get(g.collectionId) ?? g.collectionId;
    grantsByUser.get(uid)!.push({ id: g.collectionId, name });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? '';

  const result = users.map((u) => ({
    _id: u._id.toString(),
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    isSuperAdmin: u.email === superAdminEmail,
    collections: grantsByUser.get(u._id.toString()) ?? [],
  }));

  return NextResponse.json({ users: result });
}
