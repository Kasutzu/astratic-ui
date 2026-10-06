import type { Metadata } from "next"
import { ResultadosView } from "./resultados-view"

export const metadata: Metadata = { title: "Resultados" }

/** Los resultados de la collab; el informe sale del layout (`CollabProvider`). */
export default function CollabResultadosPage() {
  return <ResultadosView />
}
