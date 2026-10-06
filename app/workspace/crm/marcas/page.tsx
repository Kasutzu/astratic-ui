import type { Metadata } from "next"
import { MarcasView } from "./marcas-view"

export const metadata: Metadata = { title: "Marcas · CRM" }

export default async function MarcasPage({ searchParams }: { searchParams: Promise<{ registro?: string; nueva?: string }> }) {
  const { registro, nueva } = await searchParams
  return <MarcasView abiertaInicial={registro ?? null} nuevaInicial={nueva === "1"} />
}
