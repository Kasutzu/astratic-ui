import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hoy, listarFacturas, listarFormularios, listarMateriales, listarTareas, obtenerCollab, obtenerContrato, obtenerInforme, obtenerMarca, obtenerPerfil } from "@/lib/influencer/consultas"
import { tareasDe } from "@/lib/influencer/tareas"
import { PageBody } from "@/components/app/page-header"
import { CollabProvider } from "./collab-provider"
import { BriefCabecera } from "./brief-cabecera"

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const collab = obtenerCollab(id)
  const marca = collab ? obtenerMarca(collab.marcaId) : null
  return { title: collab && marca ? `${marca.nombre} · ${collab.campana}` : "Collab" }
}

/**
 * La ficha de una collab es una página propia: arriba, en todas sus pestañas, el brief compacto con
 * la imagen de la campaña; debajo, la navegación entre sus partes (una ruta por pestaña) y la parte
 * abierta, a todo el ancho.
 */
export default async function CollabLayout({ params, children }: { params: Params; children: React.ReactNode }) {
  const { id } = await params
  const collab = obtenerCollab(id)
  const marca = collab ? obtenerMarca(collab.marcaId) : null
  if (!collab || !marca) notFound()
  return (
    <CollabProvider inicial={{ collab, marca, perfil: obtenerPerfil(), hoy: hoy(), materiales: listarMateriales(id), tareas: tareasDe(listarTareas(), { tipo: "collab", id }), formularios: listarFormularios(id), facturas: listarFacturas(id), contrato: obtenerContrato(id), informe: obtenerInforme(id) }}>
      <PageBody className="gap-5 px-4 pb-28 md:px-[34px] md:pb-10">
        <BriefCabecera />
        {children}
      </PageBody>
    </CollabProvider>
  )
}
