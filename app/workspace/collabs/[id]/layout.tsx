import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hoy, listarTareas, obtenerCollab, obtenerMarca } from "@/lib/influencer/consultas"
import { tareasDe } from "@/lib/influencer/tareas"
import { PageBody } from "@/components/app/page-header"
import { CollabHeader } from "./collab-header"

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const collab = obtenerCollab(id)
  const marca = collab ? obtenerMarca(collab.marcaId) : null
  return { title: collab && marca ? `${marca.nombre} · ${collab.campana}` : "Collab" }
}

/** La ficha de una collab es una página propia: cabecera con su nombre y pestañas con sus partes; cada pestaña es una ruta. */
export default async function CollabLayout({ params, children }: { params: Params; children: React.ReactNode }) {
  const { id } = await params
  const collab = obtenerCollab(id)
  const marca = collab ? obtenerMarca(collab.marcaId) : null
  if (!collab || !marca) notFound()
  const pendientes = tareasDe(listarTareas(), { tipo: "collab", id }).filter((t) => !t.hecha).length
  return (
    <PageBody className="gap-6 px-4 pb-28 md:px-[34px] md:pb-10">
      <CollabHeader collab={collab} marca={marca} tareasPendientes={pendientes} hoy={hoy()} />
      {children}
    </PageBody>
  )
}
