import { notFound } from "next/navigation"
import { hoy, listarActividad, listarMateriales, listarTareas, obtenerCollab, obtenerMarca } from "@/lib/influencer/consultas"
import { tareasDe } from "@/lib/influencer/tareas"
import { ResumenView } from "./resumen-view"

export default async function CollabResumenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collab = obtenerCollab(id)
  const marca = collab ? obtenerMarca(collab.marcaId) : null
  if (!collab || !marca) notFound()
  return (
    <ResumenView
      hoy={hoy()}
      collab={collab}
      marca={marca}
      tareas={tareasDe(listarTareas(), { tipo: "collab", id })}
      actividad={listarActividad({ collabId: id })}
      materiales={listarMateriales(id).length}
    />
  )
}
