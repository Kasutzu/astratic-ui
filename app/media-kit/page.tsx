import type { Metadata } from "next"
import { marcasTrabajadas, obtenerMediaKit, obtenerPerfil } from "@/lib/influencer/consultas"
import { MediaKitDocumento } from "./media-kit-documento"

export const metadata: Metadata = { title: "Media kit" }

/*
 * El media kit suelto, para mandarlo por enlace o exportarlo a PDF. En el portal la ruta llevará el
 * usuario de la creadora (o un token) en vez de ser única.
 */
export default function MediaKitPage() {
  return <MediaKitDocumento perfil={obtenerPerfil()} kit={obtenerMediaKit()} marcasTrabajadas={marcasTrabajadas()} />
}
