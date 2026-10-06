import type { Metadata } from "next"
import { PipelineView } from "./pipeline-view"

export const metadata: Metadata = { title: "Pipeline · CRM" }

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ registro?: string; nueva?: string }> }) {
  const { registro, nueva } = await searchParams
  return <PipelineView abiertaInicial={registro ?? null} nuevaInicial={nueva === "1"} />
}
