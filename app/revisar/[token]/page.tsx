import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hoy, obtenerPerfil, obtenerRevision } from "@/lib/influencer/consultas"
import { RevisarView } from "./revisar-view"

type Params = Promise<{ token: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { token } = await params
  const r = obtenerRevision(token)
  return { title: r ? `Revisar · ${r.pieza.titulo}` : "Enlace no válido" }
}

/*
 * Lo que ve la marca al abrir el enlace de revisión, sin cuenta: la versión, las anteriores, sus
 * notas ancladas al texto o al segundo del vídeo, y los botones de aprobar o pedir cambios. En el
 * portal el token se comprueba en la base de datos y caduca; aquí sale de los datos de ejemplo.
 */
export default async function RevisarPage({ params }: { params: Params }) {
  const { token } = await params
  const revision = obtenerRevision(token)
  if (!revision) notFound()
  return <RevisarView hoy={hoy()} perfil={obtenerPerfil()} {...revision} />
}
