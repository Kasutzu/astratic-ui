import type { Metadata } from "next"
import { datosAstratic, hoy, listarFacturas, obtenerDatosFiscales } from "@/lib/influencer/consultas"
import { siguienteNumero } from "@/lib/influencer/facturacion"
import { FacturacionView } from "./facturacion-view"

export const metadata: Metadata = { title: "Facturación" }

/** La facturación de la collab; la collab y sus facturas salen del layout (`CollabProvider`). */
export default function CollabFacturacionPage() {
  return <FacturacionView fiscales={obtenerDatosFiscales()} astratic={datosAstratic()} siguiente={siguienteNumero(listarFacturas(), hoy())} />
}
