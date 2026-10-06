import type { Metadata } from "next"
import {
  hoy,
  listarAvisos,
  listarCollabsActivas,
  listarEnlaces,
  listarMarcas,
  listarPropuestas,
  listarTareas,
  obtenerPerfil,
  resumenInicio,
} from "@/lib/influencer/consultas"
import { InicioView } from "./inicio-view"

export const metadata: Metadata = { title: "Inicio" }

function saludo(d: Date) {
  const h = d.getHours()
  if (h < 13) return "Buenos días"
  if (h < 20) return "Buenas tardes"
  return "Buenas noches"
}

export default function InicioPage() {
  const ahora = hoy()
  const { destacado, avisos } = listarAvisos()
  return (
    <InicioView
      greeting={saludo(new Date(ahora))}
      now={ahora}
      perfil={obtenerPerfil()}
      cifras={resumenInicio()}
      collabs={listarCollabsActivas().filter((c) => c.estado === "en-curso" || c.estado === "por-empezar")}
      marcas={listarMarcas()}
      propuestas={listarPropuestas()}
      tareas={listarTareas()}
      destacado={destacado}
      avisos={avisos}
      enlaces={listarEnlaces()}
    />
  )
}
