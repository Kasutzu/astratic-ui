import type { Metadata } from "next"
import { obtenerInformePorToken, obtenerPerfil } from "@/lib/influencer/consultas"
import { InformeView } from "./informe-view"

export const metadata: Metadata = { title: "Informe de resultados", robots: { index: false } }

/*
 * El informe de resultados que recibe la marca por enlace, sin cuenta. En el portal el token se
 * comprueba en la base de datos y caduca.
 */
export default async function InformePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = obtenerInformePorToken(token)
  return <InformeView token={token} inicial={r ? { registro: r.registro, collab: r.collab, marca: r.marca } : null} perfil={obtenerPerfil()} />
}
