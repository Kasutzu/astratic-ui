import type { Metadata } from "next"
import { listarClausulas, listarPlantillasContrato, obtenerDatosFiscales } from "@/lib/influencer/consultas"
import { ContratoView } from "./contrato-view"

export const metadata: Metadata = { title: "Contrato" }

/** El contrato de la collab; la collab y su contrato salen del layout (`CollabProvider`). */
export default function CollabContratoPage() {
  return <ContratoView plantillas={listarPlantillasContrato()} clausulas={listarClausulas()} fiscales={obtenerDatosFiscales()} />
}
