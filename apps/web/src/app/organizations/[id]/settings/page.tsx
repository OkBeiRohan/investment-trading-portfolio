"use client";

import { useState } from "react";
import { useOrganization } from "@/hooks/organization/use-organization";
import { Loader2, Trash2, Shield, Mail, Plus } from "lucide-react";
import type { OrganizationRole } from "@repo/schema";

export default function OrganizationSettingsPage() {
  const {
    activeOrganization,
    isLoading,
    inviteMember,
    removeMember,
    updateMemberRole,
  } = useOrganization();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("member");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganization?.id) return;
    
    setInviting(true);
    try {
      await inviteMember({
        organizationId: activeOrganization.id,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
      // Success message could go here
    } catch (err) {
      console.error(err);
    } finally {
      setInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">Manage members and permissions</p>
      </div>

      {/* Invite Member */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Invite Member</h2>
        <form onSubmit={handleInvite} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Email Address</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="colleague@company.com"
            />
          </div>
          <div className="w-48">
            <label className="mb-2 block text-sm font-medium">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Invite
          </button>
        </form>
      </div>

      {/* Members List */}
      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Members</h2>
        </div>
        <div className="divide-y">
          {activeOrganization?.members?.map((member: any) => (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <span className="font-semibold uppercase">
                    {member.user?.name?.charAt(0) || member.user?.email?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{member.user?.name}</p>
                  <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
                  <Shield className="h-3 w-3" />
                  {member.role}
                </div>
                
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to remove this member?")) {
                      removeMember({
                        organizationId: activeOrganization.id,
                        memberIdOrEmail: member.id,
                      });
                    }
                  }}
                  className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  title="Remove member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
