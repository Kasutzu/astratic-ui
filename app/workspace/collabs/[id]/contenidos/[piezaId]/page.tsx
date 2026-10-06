import type { Metadata } from "next"
import { listarPlantillasGuion, obtenerPieza } from "@/lib/influencer/consultas"
import type { TipoVersion } from "@/lib/influencer/modelo"
import { PiezaView } from "./pieza-view"

type Params = Promise<{ id: string; piezaId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, piezaId } = await params
  return { title: obtenerPieza(id, piezaId)?.pieza.titulo ?? "Pieza" }
}

const PARTES: TipoVersion[] = ["guion", "media"]

/** El editor de una pieza; la pieza sale del estado de la collab (`CollabProvider`), aquí solo las plantillas. */
export default async function PiezaPage({ params, searchParams }: { params: Params; searchParams: Promise<{ parte?: string }> }) {
  const { piezaId } = await params
  const { parte } = await searchParams
  return <PiezaView piezaId={piezaId} parte={PARTES.find((p) => p === parte)} plantillas={listarPlantillasGuion()} />
}
