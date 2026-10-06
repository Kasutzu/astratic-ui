import { notFound } from "next/navigation"
import { listarMateriales, obtenerCollab, obtenerMarca } from "@/lib/influencer/consultas"
import { BriefView } from "./brief-view"

export default async function CollabBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collab = obtenerCollab(id)
  const marca = collab ? obtenerMarca(collab.marcaId) : null
  if (!collab || !marca) notFound()
  return <BriefView collab={collab} materiales={listarMateriales(id).filter((m) => m.origen === "marca")} />
}
