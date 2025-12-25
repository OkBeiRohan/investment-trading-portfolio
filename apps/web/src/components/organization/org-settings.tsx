"use client";

import { useState } from "react";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";
import type { OrganizationRole } from "@repo/schema";
import styles from "@/app/(main)/organization/[id]/settings/settings.module.css";
import { authClient } from "@/lib/auth/auth-client";

export function OrgSettings() {
  const { data, isPending } = authClient.useActiveOrganization();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("member");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.id) return;

    setInviting(true);
    try {
      await authClient.organization.inviteMember({
        organizationId: data.id,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
    } catch (err) {
      console.error(err);
    } finally {
      setInviting(false);
    }
  };

  if (isPending) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.loader} size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Organization Settings</h1>
        <p className={styles.subtitle}>Manage members and permissions</p>
      </div>

      {/* Invite Member */}
      <div className={`${styles.section} ${styles.sectionPadding}`}>
        <h2 className={styles.sectionTitle}>Invite Member</h2>
        <form onSubmit={handleInvite} className={styles.inviteForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={styles.input}
              placeholder="colleague@company.com"
            />
          </div>
          <div className={styles.formGroupFixed}>
            <label className={styles.label}>Role</label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as OrganizationRole)
              }
              className={styles.select}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className={styles.inviteButton}
          >
            {inviting ? (
              <Loader2 size={16} className={styles.loader} />
            ) : (
              <Plus size={16} />
            )}
            Invite
          </button>
        </form>
      </div>

      {/* Members List */}
      <div className={styles.section}>
        <div className={styles.membersHeader}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Members
          </h2>
        </div>
        <div className={styles.membersList}>
          {data?.members?.map((member) => (
            <div key={member.id} className={styles.memberRow}>
              <div className={styles.memberInfo}>
                <div className={styles.avatar}>
                  <span>
                    {member.user?.name?.charAt(0) ||
                      member.user?.email?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className={styles.memberName}>{member.user?.name}</p>
                  <p className={styles.memberEmail}>{member.user?.email}</p>
                </div>
              </div>

              <div className={styles.memberActions}>
                <div className={styles.roleBadge}>
                  <Shield size={12} />
                  {member.role}
                </div>

                <button
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to remove this member?")
                    ) {
                      authClient.organization.removeMember({
                        organizationId: data.id,
                        memberIdOrEmail: member.id,
                      });
                    }
                  }}
                  className={styles.removeButton}
                  title="Remove member"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
