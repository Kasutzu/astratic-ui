import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { listarCollabs, listarMarcas, obtenerMarca, obtenerPerfil, obtenerPropuesta } from "@/lib/influencer/consultas"
import { PropuestaDocumento } from "./propuesta-documento"

export const metadata: Metadata = { title: "Propuesta y media kit" }

/*
 * El documento que recibe la marca: media kit y presupuesto en A4, se exporta a PDF desde el navegador
 * o se manda este enlace. En el portal la ruta llevará un token imposible de adivinar en vez del id.
 */
export default async function PropuestaDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const propuesta = obtenerPropuesta(id)
  const marca = propuesta ? obtenerMarca(propuesta.marcaId) : null
  if (!propuesta || !marca) notFound()
  const marcas = listarMarcas()
  const trabajadas = Array.from(new Set(listarCollabs().map((c) => c.marcaId)))
    .map((mid) => marcas.find((m) => m.id === mid)?.nombre)
    .filter((n): n is string => !!n)
  return <PropuestaDocumento propuesta={propuesta} marca={marca} perfil={obtenerPerfil()} marcasTrabajadas={trabajadas} />
}
