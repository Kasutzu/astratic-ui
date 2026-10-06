import { notFound } from "next/navigation"
import { hoy, listarMateriales, obtenerCollab } from "@/lib/influencer/consultas"
import { MaterialesView } from "./materiales-view"

export default async function CollabMaterialesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collab = obtenerCollab(id)
  if (!collab) notFound()
  return <MaterialesView hoy={hoy()} collab={collab} materiales={listarMateriales(id)} />
}
