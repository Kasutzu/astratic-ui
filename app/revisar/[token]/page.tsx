import type { Metadata } from "next"
import { hoy, obtenerPerfil, obtenerRevision, revisionesPendientes } from "@/lib/influencer/consultas"
import { RevisarView } from "./revisar-view"

type Params = Promise<{ token: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { token } = await params
  const r = obtenerRevision(token)
  return { title: r ? `Revisar · ${r.pieza.titulo}` : "Revisión de contenido", robots: { index: false } }
}

/*
 * Lo que ve la marca al abrir el enlace de revisión, sin cuenta: la versión y las anteriores, sus
 * notas ancladas al texto, al segundo del vídeo o al punto de la foto, la conversación, y aprobar o
 * pedir cambios. En el portal el token se comprueba en la base de datos y caduca.
 */
export default async function RevisarPage({ params }: { params: Params }) {
  const { token } = await params
  const revision = obtenerRevision(token)
  return <RevisarView token={token} inicial={revision} perfil={obtenerPerfil()} hoy={hoy()} pendientes={revision ? revisionesPendientes(revision.collab.id) : []} />
}
