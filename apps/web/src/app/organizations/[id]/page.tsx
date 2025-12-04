"use client";

import { useEffect } from "react";
import { useOrganization } from "@/hooks/organization/use-organization";
import { useParams } from "next/navigation";
import { Loader2, Users, TrendingUp, Activity } from "lucide-react";

export default function OrganizationDashboard() {
  const params = useParams();
  const { activeOrganization, switchOrganization, isLoading } = useOrganization();

  useEffect(() => {
    if (params?.id && activeOrganization?.id !== params.id) {
      switchOrganization(params.id as string);
    }
  }, [params?.id, activeOrganization?.id, switchOrganization]);

  if (isLoading || activeOrganization?.id !== params?.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{activeOrganization?.name}</h1>
        <p className="text-muted-foreground">Organization Dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Members</p>
              <h3 className="text-2xl font-bold">{activeOrganization?.members?.length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Strategies</p>
              <h3 className="text-2xl font-bold">3</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-100 p-3">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's P&L</p>
              <h3 className="text-2xl font-bold text-green-600">+₹12,450</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for more org-specific content */}
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Organization activity and trading metrics will appear here.</p>
      </div>
    </div>
  );
}

