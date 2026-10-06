"use client"

import type { MediaKit, Perfil } from "@/lib/influencer/modelo"
import { bloquesVisibles } from "@/lib/influencer/media-kit"
import { DocViewer } from "@/components/document/sheet"
import { DocToolbar } from "@/components/document/toolbar"
import { MediaKitHojas, hojasMediaKit } from "@/components/influencer/media-kit-doc"
import { useBorrador } from "@/components/influencer/navegador"

/** El media kit en A4 con lo último que se guardó en el editor. */
export function MediaKitDocumento({ perfil, kit, marcasTrabajadas }: { perfil: Perfil; kit: MediaKit; marcasTrabajadas: string[] }) {
  const actual = useBorrador<MediaKit>("media-kit", kit)
  const bloques = bloquesVisibles(actual)
  const hojas = hojasMediaKit(bloques)
  return (
    <DocViewer pages={hojas} toolbar={<DocToolbar title={`Media kit · ${perfil.nombre}`} meta={`${perfil.handle} · A4 · ${hojas} ${hojas === 1 ? "hoja" : "hojas"}`} backHref="/workspace/crm/media-kit" />}>
      <MediaKitHojas perfil={perfil} kit={actual} bloques={bloques} marcasTrabajadas={marcasTrabajadas} pie={`${perfil.nombre} · Media kit`} />
    </DocViewer>
  )
}
