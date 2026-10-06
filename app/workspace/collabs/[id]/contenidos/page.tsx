import { notFound } from "next/navigation"
import { hoy, obtenerCollab } from "@/lib/influencer/consultas"
import { ContenidosView } from "./contenidos-view"

export default async function CollabContenidosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collab = obtenerCollab(id)
  if (!collab) notFound()
  return <ContenidosView hoy={hoy()} collab={collab} />
}
