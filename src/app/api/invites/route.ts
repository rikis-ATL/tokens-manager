import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import dbConnect from '@/lib/mongodb';
import Invite from '@/lib/db/models/Invite';
import User from '@/lib/db/models/User';
import { generateInviteToken, hashToken } from '@/lib/auth/invite';
import { buildInviteEmailHtml } from '@/lib/email/invite-email';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { isDemoMode, getDemoAdminEmail } from '@/lib/auth/demo';

/**
 * GET /api/invites
 * Returns all non-accepted invite documents (pending or expired).
 * Admin-only via requireRole(Action.ManageUsers).
 */
export async function GET() {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  const orgId = authResult.user.organizationId;
  await dbConnect();
  const invites = await Invite.find({ status: { $ne: 'accepted' }, organizationId: orgId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ invites });
}

/**
 * POST /api/invites
 * Creates a new invite and sends the setup email via Resend — unless demo instant-provision applies.
 *
 * **Demo instant-provision** (no email): when `DEMO_MODE=true`, role `Demo`, email equals `DEMO_ADMIN_EMAIL`,
 * creates the user with password from `DEMO_ADMIN_PASSWORD`. Resend not required. If `DEMO_ORG_ID` is set,
 * the inviting admin must belong to that org.
 *
 * Body: { email, role, collectionIds? }
 * Admin-only via requireRole(Action.ManageUsers).
 */
export async function POST(request: Request) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;

  const { email, role, collectionIds } = await request.json() as {
    email: string;
    role: string;
    collectionIds?: string[];
  };

  if (!email || !role || !['Admin', 'Editor', 'Viewer', 'Demo'].includes(role)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  await dbConnect();

  // Duplicate check: existing active user account (disabled = removed, can be re-invited)
  const existingUser = await User.findOne({ email: normalizedEmail, status: { $ne: 'disabled' } });
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    );
  }

  // Duplicate check: pending non-expired invite
  const existingInvite = await Invite.findOne({
    email: normalizedEmail,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: 'A pending invitation already exists for this email' },
      { status: 409 }
    );
  }

  /** Shared demo: create Demo user immediately — no invite email (Resend not required). */
  const demoEmail = getDemoAdminEmail();
  const provisionDemoWithoutEmail =
    role === 'Demo' && isDemoMode() && demoEmail !== '' && normalizedEmail === demoEmail;

  if (provisionDemoWithoutEmail) {
    const demoPassword = (process.env.DEMO_ADMIN_PASSWORD ?? '').trim();
    if (!demoPassword) {
      return NextResponse.json(
        { error: 'Set DEMO_ADMIN_PASSWORD to provision the demo account' },
        { status: 503 },
      );
    }

    const demoOrgId = process.env.DEMO_ORG_ID?.trim();
    if (demoOrgId && session.user.organizationId !== demoOrgId) {
      return NextResponse.json(
        {
          error:
            'Demo user can only be created in the organization that matches DEMO_ORG_ID',
        },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(demoPassword, 12);
    await User.create({
      displayName: 'Shared demo',
      email: normalizedEmail,
      passwordHash,
      role: 'Demo',
      organizationId: session.user.organizationId,
      status: 'active',
    });

    // Org-level Demo sees all collections — no CollectionPermission rows (avoids enum mismatch; same as unscoped invite).

    return NextResponse.json(
      { demoProvisioned: true, email: normalizedEmail },
      { status: 201 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  // Generate token pair
  const plainToken = generateInviteToken();
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await Invite.create({
    email: normalizedEmail,
    token: hashedToken,
    role,
    createdBy: session.user.id,
    organizationId: session.user.organizationId,
    expiresAt,
    status: 'pending',
    ...(collectionIds?.length ? { collectionIds } : {}),
  });

  // Send email
  const setupUrl = `${process.env.NEXTAUTH_URL}/auth/invite-setup?token=${plainToken}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'Token Manager <noreply@tokenflow.studio>',
    to: [normalizedEmail],
    subject: `You've been invited to Token Manager as ${role}`,
    html: buildInviteEmailHtml(normalizedEmail, role, setupUrl),
  });

  if (emailError) {
    console.error('[invites] Resend error:', emailError);
    // Roll back invite creation if email delivery failed
    await Invite.deleteOne({ _id: invite._id });
    return NextResponse.json({ error: 'Failed to send invite email', detail: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ invite }, { status: 201 });
}
