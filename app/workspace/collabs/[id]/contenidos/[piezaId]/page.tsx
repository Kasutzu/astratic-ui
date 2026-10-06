import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hoy, obtenerMarca, obtenerPieza } from "@/lib/influencer/consultas"
import { PiezaView } from "./pieza-view"

type Params = Promise<{ id: string; piezaId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, piezaId } = await params
  return { title: obtenerPieza(id, piezaId)?.pieza.titulo ?? "Pieza" }
}

export default async function PiezaPage({ params }: { params: Params }) {
  const { id, piezaId } = await params
  const resultado = obtenerPieza(id, piezaId)
  const marca = resultado ? obtenerMarca(resultado.collab.marcaId) : null
  if (!resultado || !marca) notFound()
  return <PiezaView hoy={hoy()} collab={resultado.collab} pieza={resultado.pieza} marca={marca} />
}
