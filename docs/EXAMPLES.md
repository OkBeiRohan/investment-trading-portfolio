# Practical Implementation Examples

## Real-World Code for Advanced Patterns

> **Production-ready examples with complete error handling and loading states**

---

## 🏗️ Parallel Routes with Suspense Boundaries

### Home Dashboard with Bento Grid

```typescript
// app/(dashboard)/(home)/layout.tsx
export default function HomeLayout({
  children,
  networth,     // @networth
  pulse,        // @pulse
  cashflow,     // @cashflow
  expenses,     // @expenses
  investments,  // @investments
  alerts,       // @alerts
  goals,        // @goals
  quickactions, // @quickactions
}: {
  children: React.ReactNode;
  networth: React.ReactNode;
  pulse: React.ReactNode;
  cashflow: React.ReactNode;
  expenses: React.ReactNode;
  investments: React.ReactNode;
  alerts: React.ReactNode;
  goals: React.ReactNode;
  quickactions: React.ReactNode;
}) {
  return (
    <div className="p-6 space-y-6">
      {children}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-4 gap-6 auto-rows-[200px]">
        {/* Net Worth - 2x1 (large) */}
        <div className="col-span-2 row-span-1">
          <Suspense fallback={<BentoSkeleton />}>
            {networth}
          </Suspense>
        </div>

        {/* Pulse Indicators - 2x1 (4 micro cards) */}
        <div className="col-span-2 row-span-1">
          <Suspense fallback={<BentoSkeleton count={4} />}>
            {pulse}
          </Suspense>
        </div>

        {/* Cash Flow - 2x2 (tall) */}
        <div className="col-span-2 row-span-2">
          <Suspense fallback={<BentoSkeleton large />}>
            {cashflow}
          </Suspense>
        </div>

        {/* Expenses - 1x1 */}
        <div className="col-span-1 row-span-1">
          <Suspense fallback={<BentoSkeleton />}>
            {expenses}
          </Suspense>
        </div>

        {/* Investments - 1x1 */}
        <div className="col-span-1 row-span-1">
          <Suspense fallback={<BentoSkeleton />}>
            {investments}
          </Suspense>
        </div>

        {/* Alerts - 2x1 */}
        <div className="col-span-2 row-span-1">
          <Suspense fallback={<BentoSkeleton />}>
            {alerts}
          </Suspense>
        </div>

        {/* Goals - 1x1 */}
        <div className="col-span-1 row-span-1">
          <Suspense fallback={<BentoSkeleton />}>
            {goals}
          </Suspense>
        </div>

        {/* Quick Actions - 3x1 */}
        <div className="col-span-3 row-span-1">
          <Suspense fallback={<BentoSkeleton />}>
            {quickactions}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

### Individual Parallel Route (Server Component)

```typescript
// app/(dashboard)/(home)/@networth/page.tsx
import { api } from "@/lib/trpc/server";
import { cache } from "react";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { GlassmorphicContainer } from "@/components/ui/glassmorphic-container";
import { TrendingUp, TrendingDown } from "lucide-react";

// Cache the data for this request
const getNetWorth = cache(async () => {
  return await api.wealth.getNetWorth();
});

export default async function NetWorthSlot() {
  const netWorth = await getNetWorth();

  const isPositive = netWorth.change > 0;

  return (
    <GlassmorphicContainer className="h-full p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Net Worth</p>
          <h3 className="text-3xl font-bold mt-1">
            ₹{netWorth.total.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          isPositive ? "text-green-500" : "text-red-500"
        }`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="font-semibold">
            {isPositive ? "+" : ""}{netWorth.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <NetWorthChart data={netWorth.history} className="h-24" />

      <p className="text-xs text-muted-foreground mt-4">
        {isPositive ? "+" : ""}₹{Math.abs(netWorth.change).toLocaleString("en-IN")} from last month
      </p>
    </GlassmorphicContainer>
  );
}
```

### Loading State for Parallel Route

```typescript
// app/(dashboard)/(home)/@networth/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { GlassmorphicContainer } from "@/components/ui/glassmorphic-container";

export default function NetWorthLoading() {
  return (
    <GlassmorphicContainer className="h-full p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>

      <Skeleton className="h-24 w-full" />

      <Skeleton className="h-3 w-32 mt-4" />
    </GlassmorphicContainer>
  );
}
```

### Error Boundary for Parallel Route

```typescript
// app/(dashboard)/(home)/@networth/error.tsx
"use client";

import { useEffect } from "react";
import { GlassmorphicContainer } from "@/components/ui/glassmorphic-container";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NetWorthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Net Worth widget error:", error);
  }, [error]);

  return (
    <GlassmorphicContainer className="h-full p-6 flex items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <div>
          <h3 className="font-semibold">Failed to load net worth</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || "An unexpected error occurred"}
          </p>
        </div>
        <Button onClick={reset} variant="outline" size="sm">
          Try again
        </Button>
      </div>
    </GlassmorphicContainer>
  );
}
```

---

## 🔀 Intercepted Routes for Modals

### Modal Implementation

```typescript
// app/(dashboard)/@modal/(.)expenses/transactions/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/forms/transaction-form";
import { trpc } from "@/lib/trpc/client";

export default function AddTransactionModal() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const addTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => {
      utils.transactions.getRecent.invalidate();
      router.back();
    },
  });

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <Modal.Content className="max-w-2xl">
        <Modal.Header>
          <Modal.Title>Add Transaction</Modal.Title>
          <Modal.Description>
            Quickly add a new expense or income transaction
          </Modal.Description>
        </Modal.Header>

        <div className="p-6">
          <TransactionForm
            onSubmit={(data) => addTransaction.mutate(data)}
            isLoading={addTransaction.isPending}
          />
        </div>

        <Modal.Footer>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="transaction-form"
            disabled={addTransaction.isPending}
          >
            {addTransaction.isPending ? "Adding..." : "Add Transaction"}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
```

### Full Page Fallback

```typescript
// app/(dashboard)/expenses/transactions/new/page.tsx
import { TransactionForm } from "@/components/forms/transaction-form";

export default function AddTransactionPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Transaction</h1>
        <p className="text-muted-foreground mt-2">
          Add a new expense or income transaction to track your finances
        </p>
      </div>

      <TransactionForm />
    </div>
  );
}
```

### Default Modal Fallback

```typescript
// app/(dashboard)/@modal/default.tsx
export default function DefaultModal() {
  return null; // No modal shown by default
}
```

---

## 🎨 Bento Grid with Responsive Layout

### Responsive Bento Grid Component

```typescript
// components/bento/bento-grid.tsx
"use client";

import { useEffect, useState } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface BentoGridProps {
  children: React.ReactNode;
  layout: {
    desktop: Layout[];
    mobile: Layout[];
  };
  editable?: boolean;
  onLayoutChange?: (layout: Layout[]) => void;
}

export function BentoGrid({
  children,
  layout,
  editable = false,
  onLayoutChange,
}: BentoGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="grid grid-cols-4 gap-6">{children}</div>;
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{
        lg: layout.desktop,
        xs: layout.mobile,
      }}
      breakpoints={{ lg: 1024, xs: 0 }}
      cols={{ lg: 4, xs: 1 }}
      rowHeight={200}
      isDraggable={editable}
      isResizable={editable}
      onLayoutChange={onLayoutChange}
    >
      {children}
    </ResponsiveGridLayout>
  );
}
```

### Bento Card Component

```typescript
// components/bento/bento-card.tsx
"use client";

import { cn } from "@/lib/utils";
import { GlassmorphicContainer } from "@/components/ui/glassmorphic-container";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function BentoCard({
  children,
  className,
  id,
  title,
  description,
  action,
}: BentoCardProps) {
  return (
    <GlassmorphicContainer
      key={id}
      className={cn(
        "h-full overflow-hidden transition-all duration-200",
        "hover:shadow-2xl hover:scale-[1.02]",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between p-4 border-b border-white/10">
          <div>
            {title && (
              <h3 className="text-sm font-semibold">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-4 h-[calc(100%-4rem)] overflow-auto">
        {children}
      </div>
    </GlassmorphicContainer>
  );
}
```

---

## 🧠 AI-Powered Features

### Command Palette with AI

```typescript
// hooks/use-command-palette.ts
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const { data: suggestions, isLoading } = trpc.ai.getSuggestions.useQuery(
    { query },
    { enabled: query.length > 2 }
  );

  const { data: naturalLanguageResults } = trpc.ai.processQuery.useQuery(
    { query },
    { enabled: query.length > 10 } // Only process full sentences
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const executeCommand = (command: string) => {
    switch (command) {
      case "add-expense":
        router.push("/expenses/transactions/new");
        break;
      case "view-networth":
        router.push("/networth");
        break;
      // ... more commands
    }
    setOpen(false);
  };

  return {
    open,
    setOpen,
    query,
    setQuery,
    suggestions,
    naturalLanguageResults,
    isLoading,
    executeCommand,
  };
}
```

### AI Insight Card

```typescript
// components/ai/ai-insight-card.tsx
"use client";

import { GlassmorphicContainer } from "@/components/ui/glassmorphic-container";
import { Sparkles, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface AIInsightCardProps {
  type: "positive" | "warning" | "info";
  title: string;
  description: string;
  metric?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AIInsightCard({
  type,
  title,
  description,
  metric,
  action,
}: AIInsightCardProps) {
  const icon = {
    positive: <TrendingUp className="h-5 w-5 text-green-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-orange-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  }[type];

  return (
    <GlassmorphicContainer className="p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-xs font-medium text-primary">AI Insight</p>
            </div>
            <h4 className="font-semibold mt-1">{title}</h4>
          </div>

          <p className="text-sm text-muted-foreground">{description}</p>

          {metric && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {metric}
            </div>
          )}

          {action && (
            <button
              onClick={action.onClick}
              className="text-sm text-primary hover:underline font-medium"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </GlassmorphicContainer>
  );
}
```

### Predictive Chart Component

```typescript
// components/charts/predictive-chart.tsx
"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PredictiveChartProps {
  historical: { date: string; value: number }[];
  predictions: {
    date: string;
    value: number;
    confidenceLower: number;
    confidenceUpper: number;
  }[];
}

export function PredictiveChart({ historical, predictions }: PredictiveChartProps) {
  const data = {
    labels: [
      ...historical.map((d) => d.date),
      ...predictions.map((d) => d.date),
    ],
    datasets: [
      {
        label: "Historical",
        data: historical.map((d) => d.value),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
      {
        label: "Prediction",
        data: [
          ...Array(historical.length - 1).fill(null),
          historical[historical.length - 1].value,
          ...predictions.map((d) => d.value),
        ],
        borderColor: "rgb(168, 85, 247)",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
      },
      {
        label: "Confidence Interval",
        data: [
          ...Array(historical.length).fill(null),
          ...predictions.map((d) => d.confidenceUpper),
        ],
        borderColor: "transparent",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        fill: "+1",
        pointRadius: 0,
      },
      {
        label: "",
        data: [
          ...Array(historical.length).fill(null),
          ...predictions.map((d) => d.confidenceLower),
        ],
        borderColor: "transparent",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
      },
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}
```

---

## 🏢 Workspace Aggregation

### Family Aggregation Strategy

```typescript
// lib/workspace/aggregation.ts
export interface AggregationStrategy {
  calculateNetWorth: (members: Member[]) => Promise<number>;
  getBreakdown: (members: Member[]) => Promise<BreakdownItem[]>;
  aggregateExpenses: (members: Member[]) => Promise<Expense[]>;
}

export class FamilyAggregationStrategy implements AggregationStrategy {
  async calculateNetWorth(members: Member[]): Promise<number> {
    // Fetch all members' net worth in parallel
    const netWorths = await Promise.all(
      members.map((member) => api.wealth.getNetWorth({ userId: member.userId }))
    );

    // Sum for family
    return netWorths.reduce((total, nw) => total + nw.total, 0);
  }

  async getBreakdown(members: Member[]): Promise<BreakdownItem[]> {
    const breakdown = await Promise.all(
      members.map(async (member) => {
        const netWorth = await api.wealth.getNetWorth({
          userId: member.userId,
        });
        return {
          category: member.name,
          value: netWorth.total,
          owner: member.userId,
          relationship: member.relationship,
        };
      })
    );

    return breakdown.sort((a, b) => b.value - a.value);
  }

  async aggregateExpenses(members: Member[]): Promise<Expense[]> {
    const allExpenses = await Promise.all(
      members.map((member) => api.expenses.getAll({ userId: member.userId }))
    );

    // Flatten and deduplicate shared expenses
    const flattened = allExpenses.flat();
    return this.deduplicateSharedExpenses(flattened);
  }

  private deduplicateSharedExpenses(expenses: Expense[]): Expense[] {
    const expenseMap = new Map<string, Expense>();

    for (const expense of expenses) {
      if (expense.isShared) {
        // If shared expense already exists, skip
        if (!expenseMap.has(expense.sharedId)) {
          expenseMap.set(expense.sharedId, {
            ...expense,
            splitBetween: [expense.userId],
          });
        } else {
          // Add this user to split list
          const existing = expenseMap.get(expense.sharedId)!;
          existing.splitBetween.push(expense.userId);
        }
      } else {
        // Non-shared expense, use unique ID
        expenseMap.set(expense.id, expense);
      }
    }

    return Array.from(expenseMap.values());
  }
}
```

### Business Aggregation Strategy

```typescript
// lib/workspace/aggregation.ts (continued)
export class BusinessAggregationStrategy implements AggregationStrategy {
  async calculateNetWorth(members: Member[]): Promise<number> {
    // Group by teams first
    const teams = this.groupByTeams(members);

    // Calculate net worth per team
    const teamNetWorths = await Promise.all(
      teams.map(async (team) => {
        const members = team.members;
        const netWorths = await Promise.all(
          members.map((m) => api.wealth.getNetWorth({ userId: m.userId }))
        );
        return netWorths.reduce((sum, nw) => sum + nw.total, 0);
      })
    );

    // Sum all teams
    return teamNetWorths.reduce((a, b) => a + b, 0);
  }

  async getBreakdown(members: Member[]): Promise<BreakdownItem[]> {
    const teams = this.groupByTeams(members);

    const breakdown = await Promise.all(
      teams.map(async (team) => {
        const teamNetWorth = await this.calculateTeamNetWorth(team);
        return {
          category: team.name,
          value: teamNetWorth,
          teamId: team.id,
        };
      })
    );

    return breakdown.sort((a, b) => b.value - a.value);
  }

  private groupByTeams(members: Member[]): Team[] {
    const teamsMap = new Map<string, Team>();

    for (const member of members) {
      if (!member.teamId) continue;

      if (!teamsMap.has(member.teamId)) {
        teamsMap.set(member.teamId, {
          id: member.teamId,
          name: member.teamName || "Unnamed Team",
          members: [],
        });
      }

      teamsMap.get(member.teamId)!.members.push(member);
    }

    return Array.from(teamsMap.values());
  }

  private async calculateTeamNetWorth(team: Team): Promise<number> {
    const netWorths = await Promise.all(
      team.members.map((m) => api.wealth.getNetWorth({ userId: m.userId }))
    );

    return netWorths.reduce((sum, nw) => sum + nw.total, 0);
  }
}
```

### Aggregation View Component

```typescript
// app/(dashboard)/workspaces/[workspaceId]/aggregate/page.tsx
import { api } from "@/lib/trpc/server";
import {
  FamilyAggregationStrategy,
  BusinessAggregationStrategy,
} from "@/lib/workspace/aggregation";
import { AggregatedNetWorthChart } from "@/components/charts/aggregated-networth-chart";
import { GlassmorphicContainer } from "@/components/ui/glassmorphic-container";

export default async function WorkspaceAggregatePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const workspace = await api.workspaces.get({ id: params.workspaceId });
  const members = await api.workspaces.getMembers({ id: params.workspaceId });

  // Select aggregation strategy based on workspace type
  const strategy =
    workspace.type === "FAMILY"
      ? new FamilyAggregationStrategy()
      : new BusinessAggregationStrategy();

  const netWorth = await strategy.calculateNetWorth(members);
  const breakdown = await strategy.getBreakdown(members);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{workspace.name}</h1>
          <p className="text-muted-foreground">
            {workspace.type === "FAMILY" ? "Family" : "Business"} Aggregated View
          </p>
        </div>
        <WorkspaceTypeBadge type={workspace.type} />
      </div>

      {/* Total Net Worth */}
      <GlassmorphicContainer className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {workspace.type === "FAMILY" ? "Family" : "Business"} Net Worth
            </p>
            <h2 className="text-4xl font-bold mt-2">
              ₹{netWorth.toLocaleString("en-IN")}
            </h2>
          </div>
        </div>

        <AggregatedNetWorthChart breakdown={breakdown} />
      </GlassmorphicContainer>

      {/* Breakdown by Member/Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {breakdown.map((item) => (
          <GlassmorphicContainer key={item.category} className="p-6">
            <h3 className="font-semibold text-lg">{item.category}</h3>
            <p className="text-3xl font-bold mt-2">
              ₹{item.value.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {((item.value / netWorth) * 100).toFixed(1)}% of total
            </p>

            {item.relationship && (
              <p className="text-xs text-muted-foreground mt-1">
                Relationship: {item.relationship}
              </p>
            )}
          </GlassmorphicContainer>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 Comparison Tools Implementation

### Comparison Engine

```typescript
// lib/comparison/engine.ts
export interface ComparisonItem {
  id: string;
  name: string;
  fields: Record<string, any>;
  price?: number;
}

export interface ComparisonField {
  key: string;
  label: string;
  type: "number" | "text" | "boolean" | "rating";
  weight: number; // 0-10
  higherIsBetter?: boolean; // For numeric fields
}

export class ComparisonEngine {
  calculateScore(item: ComparisonItem, fields: ComparisonField[]): number {
    let totalScore = 0;
    let totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);

    for (const field of fields) {
      const value = item.fields[field.key];
      const normalizedScore = this.normalizeValue(value, field);
      totalScore += normalizedScore * field.weight;
    }

    return (totalScore / totalWeight) * 100;
  }

  private normalizeValue(value: any, field: ComparisonField): number {
    switch (field.type) {
      case "number":
        // Normalize to 0-1 scale
        // This is simplified - in production, use min/max from all items
        return field.higherIsBetter ? value / 10 : 1 - value / 10;

      case "rating":
        return value / 5; // Assuming 5-star rating

      case "boolean":
        return value ? 1 : 0;

      case "text":
        // Text fields typically don't contribute to score
        return 0;

      default:
        return 0;
    }
  }

  rankItems(
    items: ComparisonItem[],
    fields: ComparisonField[]
  ): (ComparisonItem & { score: number; rank: number })[] {
    const scored = items.map((item) => ({
      ...item,
      score: this.calculateScore(item, fields),
    }));

    const ranked = scored
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return ranked;
  }
}
```

### Comparison UI Component

```typescript
// components/comparison/comparison-table.tsx
"use client";

import { useState } from "react";
import { ComparisonEngine, ComparisonField, ComparisonItem } from "@/lib/comparison/engine";
import { GlassmorphicContainer } from "@/components/ui/glassmorphic-container";
import { Slider } from "@/components/ui/slider";
import { Trophy, Medal } from "lucide-react";

interface ComparisonTableProps {
  items: ComparisonItem[];
  fields: ComparisonField[];
  onUpdateWeights?: (weights: Record<string, number>) => void;
}

export function ComparisonTable({
  items,
  fields: initialFields,
  onUpdateWeights,
}: ComparisonTableProps) {
  const [fields, setFields] = useState(initialFields);
  const engine = new ComparisonEngine();
  const ranked = engine.rankItems(items, fields);

  const handleWeightChange = (fieldKey: string, weight: number) => {
    const updated = fields.map((f) =>
      f.key === fieldKey ? { ...f, weight } : f
    );
    setFields(updated);
    onUpdateWeights?.(
      Object.fromEntries(updated.map((f) => [f.key, f.weight]))
    );
  };

  return (
    <div className="space-y-6">
      {/* Field Weights */}
      <GlassmorphicContainer className="p-6">
        <h3 className="font-semibold mb-4">Field Weights</h3>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{field.label}</label>
                <span className="text-sm text-muted-foreground">
                  {field.weight}/10
                </span>
              </div>
              <Slider
                value={[field.weight]}
                onValueChange={([value]) =>
                  handleWeightChange(field.key, value)
                }
                min={0}
                max={10}
                step={1}
              />
            </div>
          ))}
        </div>
      </GlassmorphicContainer>

      {/* Comparison Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ranked.map((item) => (
          <GlassmorphicContainer key={item.id} className="p-6 relative">
            {item.rank === 1 && (
              <div className="absolute top-4 right-4">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
            )}
            {item.rank === 2 && (
              <div className="absolute top-4 right-4">
                <Medal className="h-6 w-6 text-gray-400" />
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-lg font-semibold">{item.name}</h4>
              {item.price && (
                <p className="text-2xl font-bold text-primary mt-1">
                  ₹{item.price.toLocaleString("en-IN")}
                </p>
              )}
            </div>

            {/* Score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Overall Score</span>
                <span className="text-sm font-semibold">
                  {item.score.toFixed(1)}/100
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="font-medium">
                    {this.formatValue(item.fields[field.key], field.type)}
                  </span>
                </div>
              ))}
            </div>

            {/* Rank Badge */}
            <div className="absolute bottom-4 left-4">
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                Rank #{item.rank}
              </div>
            </div>
          </GlassmorphicContainer>
        ))}
      </div>
    </div>
  );

  private formatValue(value: any, type: ComparisonField["type"]): string {
    switch (type) {
      case "boolean":
        return value ? "Yes" : "No";
      case "rating":
        return `${value}/5 ⭐`;
      default:
        return String(value);
    }
  }
}
```

---

## 📱 Mobile Optimization

### Responsive Sidebar

```typescript
// components/layout/sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <button className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border">
            <Menu className="h-6 w-6" />
          </button>
        </SheetTrigger>

        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-card">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">ITP</h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

---

**Status**: Production-Ready Examples
**Last Updated**: December 28, 2025
