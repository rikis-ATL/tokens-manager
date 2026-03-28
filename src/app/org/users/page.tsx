'use client';

import { useEffect, useState } from 'react';
import { UserPlus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InviteModal } from '@/components/org/InviteModal';

interface InviteRow {
  _id: string;
  email: string;
  role: string;
  status: 'pending' | 'expired';
  expiresAt: string;
}

export default function OrgUsersPage() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    setLoading(true);
    const res = await fetch('/api/invites');
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites ?? []);
    }
    setLoading(false);
  }

  function handleInviteSuccess(invite: Record<string, unknown>) {
    // Optimistically add the new row
    setInvites((prev) => [invite as unknown as InviteRow, ...prev]);
  }

  async function handleResend(id: string) {
    const res = await fetch(`/api/invites/${id}/resend`, { method: 'POST' });
    if (res.ok) {
      // Update row's expiresAt and status in-place
      const data = await res.json();
      setInvites((prev) =>
        prev.map((inv) => (inv._id === id ? { ...inv, ...data.invite, status: 'pending' } : inv))
      );
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvites((prev) => prev.filter((inv) => inv._id !== id));
    }
  }

  function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage team members and pending invitations.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Pending invites table — Phase 21 will add active member rows above this */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Expires</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td>
              </tr>
            )}
            {!loading && invites.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No pending invitations. Click &quot;Invite User&quot; to get started.
                </td>
              </tr>
            )}
            {!loading && invites.map((invite) => {
              const expired = isExpired(invite.expiresAt);
              return (
                <tr
                  key={invite._id}
                  className="border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{invite.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{invite.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={expired ? 'destructive' : 'secondary'}>
                      {expired ? 'Expired' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {formatDate(invite.expiresAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(invite._id)}
                        title="Resend invitation email"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(invite._id)}
                        title="Revoke invitation"
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InviteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
