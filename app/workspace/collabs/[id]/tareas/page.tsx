import { notFound } from "next/navigation"
import { hoy, listarTareas, obtenerCollab, obtenerMarca } from "@/lib/influencer/consultas"
import { tareasDe } from "@/lib/influencer/tareas"
import { TareasCollabView } from "./tareas-view"

export default async function CollabTareasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collab = obtenerCollab(id)
  const marca = collab ? obtenerMarca(collab.marcaId) : null
  if (!collab || !marca) notFound()
  return <TareasCollabView hoy={hoy()} collab={collab} marca={marca} tareas={tareasDe(listarTareas(), { tipo: "collab", id })} />
}
