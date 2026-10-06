import type { Metadata } from "next"
import { hoy, listarCollabs, listarContactos, listarFormularios, listarMarcas, listarPropuestas, listarTareas } from "@/lib/influencer/consultas"
import { CollabsView } from "./collabs-view"

export const metadata: Metadata = { title: "Collabs" }

export default async function CollabsPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { nueva } = await searchParams
  return (
    <CollabsView
      hoy={hoy()}
      collabs={listarCollabs()}
      marcas={listarMarcas()}
      contactos={listarContactos()}
      tareas={listarTareas()}
      propuestas={listarPropuestas()}
      formularios={listarFormularios()}
      nuevaInicial={nueva === "1"}
    />
  )
}
