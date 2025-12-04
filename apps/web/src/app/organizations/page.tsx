"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/organization/use-organization";
import { authClient } from "@/lib/auth/auth-client";
import { Plus, Loader2, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OrganizationsPage() {
  const router = useRouter();
  const { createOrganization } = useOrganization();
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your teams and trading groups
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* List Organizations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Organizations</h2>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orgs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">No organizations found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className="group flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Create Organization */}
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Create Organization</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Name</label>
              <input
                type="text"
                required
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Acme Trading"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Slug</label>
              <input
                type="text"
                required
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="acme-trading"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Organization
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

