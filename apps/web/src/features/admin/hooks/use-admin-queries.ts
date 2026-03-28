"use client";

import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const adminKeys = {
  all: ["admin"] as const,
  trading: {
    status: () => [...adminKeys.all, "trading", "status"] as const,
    users: (page: number) =>
      [...adminKeys.all, "trading", "users", page] as const,
  },
  instruments: {
    list: (filters: Record<string, string>) =>
      [...adminKeys.all, "instruments", filters] as const,
  },
  experiments: {
    list: (filters: Record<string, string>) =>
      [...adminKeys.all, "experiments", filters] as const,
    detail: (id: string) =>
      [...adminKeys.all, "experiments", id] as const,
    runs: (id: string) =>
      [...adminKeys.all, "experiments", id, "runs"] as const,
  },
};

// ---------------------------------------------------------------------------
// Fetch helper (uses same-origin /api/ rewritten to API server)
// ---------------------------------------------------------------------------

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemStatus {
  activeTraders: number;
  totalConfigs: number;
  disabled: number;
  sandbox: number;
}

export interface TradingUser {
  userId: string;
  name?: string;
  email?: string;
  tradingEnabled: boolean;
  sandboxMode: boolean;
  lastReAuth?: string;
}

export interface UsersResponse {
  page: number;
  limit: number;
  items: TradingUser[];
  total: number;
}

export interface Instrument {
  instrumentKey: string;
  tradingSymbol: string;
  name: string;
  exchange: string;
  segment?: string;
  instrumentType?: string;
  isin?: string;
  industry?: string;
  lotSize?: number;
  isNifty50?: boolean;
  nifty50WeightPct?: number;
  tradingEnabled?: boolean;
  dataCollectionEnabled?: boolean;
}

export interface InstrumentsResponse {
  page: number;
  limit: number;
  items: Instrument[];
  total: number;
}

export interface Experiment {
  _id: string;
  name: string;
  description?: string;
  tier?: number;
  modelType?: string;
  status?: string;
  deployed?: boolean;
  config?: Record<string, unknown>;
  hyperparameters?: Record<string, unknown>;
  metrics?: Record<string, number>;
  mlflowExperimentId?: string;
  mlflowRunId?: string;
  mlflowModelName?: string;
  mlflowModelUri?: string;
  mlflowChampionVersion?: string;
  modelFormat?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExperimentsResponse {
  page: number;
  limit: number;
  items: Experiment[];
  total: number;
}

export interface TrainingRun {
  _id: string;
  experimentId: string;
  status: string;
  stage?: string;
  startedAt?: string;
  completedAt?: string;
  metrics?: Record<string, number>;
  mlflowRunId?: string;
  evaluationResults?: Record<string, number>;
  qualityGateResult?: {
    passed: boolean;
    reason: string;
    thresholds: Record<string, unknown>;
  };
  error?: string;
}

export interface MetricHistoryPoint {
  key: string;
  value: number;
  timestamp: number;
  step: number;
}

export interface DatasetLineage {
  dataset: { name: string; digest: string; source_type: string };
  context: string;
}

export interface MlflowModelVersion {
  name: string;
  version: string;
  run_id: string;
  status: string;
  aliases?: string[];
}

// ---------------------------------------------------------------------------
// Suspense Queries (for pages with server-side prefetch)
// ---------------------------------------------------------------------------

export function useAdminTradingStatus() {
  return useSuspenseQuery({
    queryKey: adminKeys.trading.status(),
    queryFn: () => adminFetch<SystemStatus>("/api/admin/trading/status"),
  });
}

export function useAdminInstrumentsCount() {
  return useSuspenseQuery({
    queryKey: [...adminKeys.all, "instruments-count"] as const,
    queryFn: () => adminFetch<{ total: number }>("/api/admin/instruments?limit=1"),
  });
}

export function useAdminModels() {
  return useSuspenseQuery({
    queryKey: [...adminKeys.all, "models"] as const,
    queryFn: () => adminFetch<unknown[]>("/api/admin/training/models"),
  });
}

export function useAdminUsers(page = 1) {
  return useSuspenseQuery({
    queryKey: adminKeys.trading.users(page),
    queryFn: () =>
      adminFetch<UsersResponse>(
        `/api/admin/trading/users?page=${page}&limit=20`,
      ),
  });
}

export function useAdminInstruments(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters);
  return useSuspenseQuery({
    queryKey: adminKeys.instruments.list(filters),
    queryFn: () =>
      adminFetch<InstrumentsResponse>(`/api/admin/instruments?${params}`),
  });
}

export function useAdminExperiments(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters);
  return useSuspenseQuery({
    queryKey: adminKeys.experiments.list(filters),
    queryFn: () =>
      adminFetch<ExperimentsResponse>(
        `/api/admin/training/experiments?${params}`,
      ),
  });
}

export function useAdminExperimentDetail(id: string) {
  return useSuspenseQuery({
    queryKey: adminKeys.experiments.detail(id),
    queryFn: () =>
      adminFetch<Experiment>(`/api/admin/training/experiments/${id}`),
  });
}

export function useAdminExperimentRuns(experimentId: string) {
  return useSuspenseQuery({
    queryKey: adminKeys.experiments.runs(experimentId),
    queryFn: () =>
      adminFetch<TrainingRun[]>(
        `/api/admin/training/experiments/${experimentId}/runs`,
      ),
  });
}

// ---------------------------------------------------------------------------
// MLflow-Enriched Queries
// ---------------------------------------------------------------------------

export function useExperimentMetricsHistory(
  experimentId: string,
  metricKey: string,
) {
  return useSuspenseQuery({
    queryKey: [...adminKeys.experiments.detail(experimentId), "metrics-history", metricKey] as const,
    queryFn: () =>
      adminFetch<MetricHistoryPoint[]>(
        `/api/admin/training/experiments/${experimentId}/metrics-history?metric=${encodeURIComponent(metricKey)}`,
      ),
  });
}

export function useExperimentArtifactUrl(experimentId: string, path: string) {
  return useSuspenseQuery({
    queryKey: [...adminKeys.experiments.detail(experimentId), "artifact", path] as const,
    queryFn: () =>
      adminFetch<{ url: string | null }>(
        `/api/admin/training/experiments/${experimentId}/artifacts?path=${encodeURIComponent(path)}`,
      ),
  });
}

export function useDatasetLineage(experimentId: string) {
  return useSuspenseQuery({
    queryKey: [...adminKeys.experiments.detail(experimentId), "datasets"] as const,
    queryFn: () =>
      adminFetch<DatasetLineage[]>(
        `/api/admin/training/experiments/${experimentId}/datasets`,
      ),
  });
}

export function useSystemMetrics(runId: string) {
  return useSuspenseQuery({
    queryKey: [...adminKeys.all, "runs", runId, "system-metrics"] as const,
    queryFn: () =>
      adminFetch<{
        cpu: MetricHistoryPoint[];
        gpu: MetricHistoryPoint[];
        memory: MetricHistoryPoint[];
      }>(`/api/admin/training/runs/${runId}/system-metrics`),
  });
}

export function useModelVersions(modelName: string) {
  return useSuspenseQuery({
    queryKey: [...adminKeys.all, "models", modelName, "versions"] as const,
    queryFn: () =>
      adminFetch<{ name: string; latest_versions: MlflowModelVersion[] } | null>(
        `/api/admin/training/models/${encodeURIComponent(modelName)}/versions`,
      ),
  });
}

export function useChampionVersion(modelName: string) {
  return useSuspenseQuery({
    queryKey: [...adminKeys.all, "models", modelName, "champion"] as const,
    queryFn: () =>
      adminFetch<MlflowModelVersion | null>(
        `/api/admin/training/models/${encodeURIComponent(modelName)}/champion`,
      ),
  });
}

export function useMlflowExperiments() {
  return useSuspenseQuery({
    queryKey: [...adminKeys.all, "mlflow", "experiments"] as const,
    queryFn: () =>
      adminFetch<Array<{ experiment_id: string; name: string; lifecycle_stage: string }>>(
        `/api/admin/training/mlflow/experiments`,
      ),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useEnableUserTrading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/admin/trading/users/${userId}/enable`, {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDisableUserTrading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/admin/trading/users/${userId}/disable`, {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useKillSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      fetch("/api/admin/trading/kill-switch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useSyncInstruments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/admin/instruments/sync", {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useToggleInstrumentTrading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      instrumentKey,
      enabled,
    }: {
      instrumentKey: string;
      enabled: boolean;
    }) =>
      fetch(`/api/admin/instruments/${instrumentKey}/trading`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useToggleInstrumentDataCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      instrumentKey,
      enabled,
    }: {
      instrumentKey: string;
      enabled: boolean;
    }) =>
      fetch(`/api/admin/instruments/${instrumentKey}/data-collection`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useCreateExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; status: string }) =>
      fetch("/api/admin/training/experiments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.experiments.list({}) });
    },
  });
}

export function useTriggerTrainingRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (experimentId: string) =>
      fetch(`/api/admin/training/experiments/${experimentId}/run`, {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: (_, experimentId) => {
      qc.invalidateQueries({
        queryKey: adminKeys.experiments.runs(experimentId),
      });
      qc.invalidateQueries({
        queryKey: adminKeys.experiments.detail(experimentId),
      });
    },
  });
}

export function useCancelTrainingRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      experimentId,
    }: {
      runId: string;
      experimentId: string;
    }) =>
      fetch(`/api/admin/training/runs/${runId}/cancel`, {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: (_, { experimentId }) => {
      qc.invalidateQueries({
        queryKey: adminKeys.experiments.runs(experimentId),
      });
      qc.invalidateQueries({
        queryKey: adminKeys.experiments.detail(experimentId),
      });
    },
  });
}

export function useDeployModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (experimentId: string) =>
      fetch(`/api/admin/training/models/${experimentId}/deploy`, {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: (_, experimentId) => {
      qc.invalidateQueries({
        queryKey: adminKeys.experiments.detail(experimentId),
      });
    },
  });
}
