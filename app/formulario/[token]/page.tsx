import type { Metadata } from "next"
import { obtenerFormulario, obtenerPerfil } from "@/lib/influencer/consultas"
import { FormularioView } from "./formulario-view"

export const metadata: Metadata = { title: "Brief de la campaña", robots: { index: false } }

/*
 * Lo que rellena la marca por enlace, sin cuenta: el brief con sus piezas, materiales y datos de
 * facturación, o solo los materiales. En el portal el token se comprueba en la base de datos y caduca.
 */
export default async function FormularioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = obtenerFormulario(token)
  return <FormularioView token={token} inicial={r ? { registro: r.registro, collab: r.collab, marca: r.marca } : null} perfil={obtenerPerfil()} />
}
