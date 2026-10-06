import type { Metadata } from "next"
import { hoy, obtenerContratoPorToken, obtenerDatosFiscales, obtenerPerfil } from "@/lib/influencer/consultas"
import { FirmarView } from "./firmar-view"

export const metadata: Metadata = { title: "Contrato", robots: { index: false } }

/*
 * El contrato que lee y firma la marca, sin cuenta. En el portal el token se comprueba en la base de
 * datos y caduca, y la firma guarda nombre, fecha, IP y huella del documento.
 */
export default async function ContratoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = obtenerContratoPorToken(token)
  return <FirmarView token={token} inicial={r ? { registro: r.registro, collab: r.collab, marca: r.marca } : null} perfil={obtenerPerfil()} fiscales={obtenerDatosFiscales()} hoy={hoy()} />
}
