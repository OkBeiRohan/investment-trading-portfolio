import { ExperimentDetail } from "../../_components/experiment-detail";

interface ExperimentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExperimentDetailPage({
  params,
}: ExperimentDetailPageProps) {
  const { id } = await params;
  return <ExperimentDetail experimentId={id} />;
}
