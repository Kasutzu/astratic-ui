import type { Metadata } from "next"
import { hoy, listarActividad, listarMarcas, listarPropuestas, listarTareas, obtenerPerfil } from "@/lib/influencer/consultas"
import { PropuestasView } from "./propuestas-view"

export const metadata: Metadata = { title: "Propuestas" }

export default async function PropuestasPage({ searchParams }: { searchParams: Promise<{ propuesta?: string; nueva?: string }> }) {
  const { propuesta, nueva } = await searchParams
  return (
    <PropuestasView
      hoy={hoy()}
      propuestas={listarPropuestas()}
      marcas={listarMarcas()}
      tareas={listarTareas()}
      actividad={listarActividad({})}
      tarifas={obtenerPerfil().tarifas}
      abiertaInicial={propuesta ?? null}
      nuevaInicial={nueva === "1"}
    />
  )
}
