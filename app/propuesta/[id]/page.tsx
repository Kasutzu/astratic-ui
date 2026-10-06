import type { Metadata } from "next"
import { contactoPrincipal, marcasTrabajadas, obtenerContacto, obtenerMarca, obtenerMediaKit, obtenerPerfil, obtenerPropuesta } from "@/lib/influencer/consultas"
import { PropuestaDocumentoPagina } from "./propuesta-documento"

export const metadata: Metadata = { title: "Propuesta y media kit" }

/*
 * El documento que recibe la marca: media kit y presupuesto en A4, se exporta a PDF desde el navegador
 * o se manda este enlace. En el portal la ruta llevará un token imposible de adivinar en vez del id.
 */
export default async function PropuestaDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const propuesta = obtenerPropuesta(id)
  const marca = propuesta ? obtenerMarca(propuesta.marcaId) : null
  const contacto = propuesta ? ((propuesta.contactoId ? obtenerContacto(propuesta.contactoId) : null) ?? contactoPrincipal(propuesta.marcaId)) : null
  return (
    <PropuestaDocumentoPagina
      id={id}
      inicial={propuesta && marca ? { propuesta, marca, contacto } : null}
      perfil={obtenerPerfil()}
      kit={obtenerMediaKit()}
      marcasTrabajadas={marcasTrabajadas()}
    />
  )
}
