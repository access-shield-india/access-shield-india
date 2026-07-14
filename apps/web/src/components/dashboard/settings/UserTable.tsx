'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, MoreVertical, Mail } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { User, UserRole, InviteUserInput } from '@/lib/api/types';
import { Button } from '@accessshield/ui';
import { Badge } from '@accessshield/ui';
import { Modal } from '@accessshield/ui';
import { Input } from '@accessshield/ui';
import { Select } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const ROLE_OPTIONS = [
  { value: 'customer_admin', label: 'Customer Admin' },
  { value: 'accessibility_officer', label: 'Accessibility Officer' },
  { value: 'developer', label: 'Developer' },
  { value: 'auditor', label: 'Auditor' },
];

const STATUS_CONFIG = {
  active: { label: 'Active', bg: 'bg-success-100', text: 'text-success-700' },
  pending: { label: 'Pending', bg: 'bg-accent-100', text: 'text-accent-700' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-700' },
};

async function fetchUsers(token: string): Promise<User[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  const json = await response.json();
  return json.data;
}

async function inviteUser(token: string, input: InviteUserInput) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? 'Failed to invite user');
  }
  return response.json() as Promise<{
    data: { email: string; temporaryPassword?: string; message: string };
  }>;
}

export function UserTable() {
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('developer');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState<{
    email: string;
    temporaryPassword?: string;
    message: string;
  } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchUsers(token);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (input: InviteUserInput) => {
      const token = await getAccessToken();
      return inviteUser(token, input);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('developer');
      setInviteFullName('');
      setInviteSuccess(result.data);
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading team members…" variant="card" />;
  }

  return (
    <div className="space-y-6">
      {inviteSuccess && (
        <div
          className="rounded-lg border border-success-100 bg-success-100 p-4 text-sm text-success-700"
          role="status"
        >
          <p className="font-medium">{inviteSuccess.message}</p>
          <p className="mt-1">
            Invited <strong>{inviteSuccess.email}</strong>
          </p>
          {inviteSuccess.temporaryPassword && (
            <p className="mt-2 font-mono">
              Temporary password (dev only): {inviteSuccess.temporaryPassword}
            </p>
          )}
          <button
            type="button"
            className="mt-3 text-sm font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            onClick={() => setInviteSuccess(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Invite section */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Team Members</h3>
            <p className="text-sm text-text-secondary mt-1">
              Invite team members to collaborate on accessibility improvements
            </p>
          </div>
          <Button variant="primary" onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Invite user
          </Button>
        </div>

        {/* Users table */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="border-b border-border bg-bg-secondary">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Joined
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-sm font-semibold text-text-primary"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const statusKey = user.isActive ? 'active' : 'inactive';
                const statusConfig = STATUS_CONFIG[statusKey];

                return (
                  <tr key={user.id} className="hover:bg-bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700"
                          aria-hidden="true"
                        >
                          {user.fullName?.[0] ?? user.email[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-text-primary">
                          {user.fullName ?? 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <time dateTime={user.createdAt} className="text-sm text-text-secondary">
                        {new Date(user.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" aria-label="More actions">
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setInviteEmail('');
          setInviteRole('developer');
          setInviteFullName('');
        }}
        title="Invite Team Member"
        description="Send an invitation to join your organisation"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate({
              email: inviteEmail,
              role: inviteRole,
              fullName: inviteFullName || undefined,
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <Input
            label="Full Name (optional)"
            type="text"
            value={inviteFullName}
            onChange={(e) => setInviteFullName(e.target.value)}
          />

          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={inviteRole}
            onChange={(value) => setInviteRole(value as UserRole)}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInviteModalOpen(false);
                setInviteEmail('');
                setInviteRole('developer');
                setInviteFullName('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={inviteMutation.isPending}>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              Send invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
