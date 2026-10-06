import type { Metadata } from "next"
import { hoy, listarCollabs, listarMarcas, listarTareas } from "@/lib/influencer/consultas"
import { CollabsView } from "./collabs-view"

export const metadata: Metadata = { title: "Collabs" }

export default async function CollabsPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { nueva } = await searchParams
  return <CollabsView hoy={hoy()} collabs={listarCollabs()} marcas={listarMarcas()} tareas={listarTareas()} nuevaInicial={nueva === "1"} />
}
