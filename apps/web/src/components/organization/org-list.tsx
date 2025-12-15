"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Plus, Loader2, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import styles from "@/app/organization/organizations.module.css";
import { useOrganization } from "@/hooks/auth/use-organization";

export function OrgList() {
  const {  } = useOrganization();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const { data } = await authClient.organization.list();
        if (data) {
          setOrgs(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createOrganization({ name: newOrgName, slug: newOrgSlug });
      // The hook handles redirection
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Organizations</h1>
          <p className={styles.subtitle}>
            Manage your teams and trading groups
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {/* List Organizations */}
        <div>
          <h2 className={styles.sectionTitle}>Your Organizations</h2>
          {loading ? (
            <div className={styles.loaderContainer}>
              <Loader2 className={styles.loader} />
            </div>
          ) : orgs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No organizations found</p>
            </div>
          ) : (
            <div className={styles.orgList}>
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className={styles.orgCard}
                >
                  <div className={styles.orgInfo}>
                    <div className={styles.orgIcon}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className={styles.orgName}>{org.name}</p>
                      <p className={styles.orgSlug}>{org.slug}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className={styles.arrowIcon} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Create Organization */}
        <div className={styles.createBox}>
          <h2 className={styles.sectionTitle}>Create Organization</h2>
          <form onSubmit={handleCreate}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name</label>
              <input
                type="text"
                required
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className={styles.input}
                placeholder="Acme Trading"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Slug</label>
              <input
                type="text"
                required
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                className={styles.input}
                placeholder="acme-trading"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className={styles.createButton}
            >
              {creating ? (
                <Loader2 size={16} className={styles.loader} />
              ) : (
                <Plus size={16} />
              )}
              Create Organization
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
