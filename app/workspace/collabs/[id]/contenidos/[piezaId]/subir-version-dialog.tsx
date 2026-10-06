"use client"

import * as React from "react"
import { FileVideoIcon, ImageIcon, UploadIcon, XIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { TIPOS_PIEZA, type ArchivoVersion, type Pieza } from "@/lib/influencer/modelo"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { ZonaSubida } from "@/components/influencer/zona-subida"

/** Lo que dura un vídeo, leído del propio archivo; si el navegador no puede, 30 s. */
function duracionDe(archivo: File, url: string) {
  return new Promise<number>((resolver) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => resolver(Math.round(video.duration) || 30)
    video.onerror = () => resolver(30)
    video.src = url
  })
}

/**
 * Subir una versión nueva del contenido: el vídeo o las fotos (varias en un carrusel) y el copy de
 * la publicación, que se aprueba junto al contenido. En el portal sube directo a R2 por partes.
 */
export function SubirVersionDialog({ open, onOpenChange, pieza, numero, copyAnterior, onSubir }: { open: boolean; onOpenChange: (o: boolean) => void; pieza: Pieza; numero: number; copyAnterior?: string; onSubir: (datos: { archivos: ArchivoVersion[]; copy?: string }) => void }) {
  const esVideo = TIPOS_PIEZA[pieza.tipo].media === "video"
  const [archivos, setArchivos] = React.useState<File[]>([])
  const [copy, setCopy] = React.useState(copyAnterior ?? "")
  const [subiendo, setSubiendo] = React.useState(false)

  const cerrar = (o: boolean) => {
    onOpenChange(o)
    if (!o) {
      setArchivos([])
      setCopy(copyAnterior ?? "")
    }
  }

  const subir = async () => {
    setSubiendo(true)
    // Solo en este repo: los archivos se quedan en el navegador con una URL local para verlos ya.
    const listos = await Promise.all(
      archivos.map(async (a): Promise<ArchivoVersion> => {
        const url = URL.createObjectURL(a)
        return esVideo ? { nombre: a.name, tamano: a.size, videoUrl: url, url: pieza.portadaUrl, duracion: await duracionDe(a, url) } : { nombre: a.name, tamano: a.size, url }
      }),
    )
    onSubir({ archivos: listos, copy: copy.trim() || undefined })
    setSubiendo(false)
    cerrar(false)
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {esVideo ? "Vídeo" : pieza.tipo === "carrusel" ? "Carrusel" : "Foto"} v{numero}
          </DialogTitle>
          <DialogDescription>{esVideo ? "MP4 o MOV desde el móvil. La subida aguanta cortes y enseña el progreso; un reel puede pasar de 100 MB." : pieza.tipo === "carrusel" ? "Las fotos en el orden en que se publican." : "JPG o PNG a buena resolución."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <ZonaSubida onArchivos={(fs) => setArchivos(esVideo || pieza.tipo === "foto" ? fs.slice(0, 1) : [...archivos, ...fs])} accept={esVideo ? "video/mp4,video/quicktime" : "image/*"} multiple={pieza.tipo === "carrusel"} titulo={esVideo ? "Arrastra aquí el vídeo o elígelo" : "Arrastra aquí las fotos o elígelas"} />
          {archivos.length > 0 && (
            <ul className="flex flex-col gap-1">
              {archivos.map((a, i) => (
                <li key={`${a.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm">
                  {esVideo ? <FileVideoIcon className="size-4 text-muted-foreground" /> : <ImageIcon className="size-4 text-muted-foreground" />}
                  <span className="min-w-0 flex-1 truncate">
                    {pieza.tipo === "carrusel" && <span className="text-muted-foreground">{i + 1}. </span>}
                    {a.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmt.bytes(a.size)}</span>
                  <Button variant="ghost" size="icon-xs" aria-label={`Quitar ${a.name}`} onClick={() => setArchivos(archivos.filter((_, j) => j !== i))}>
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Field>
            <FieldLabel htmlFor="sv-copy">Copy de la publicación</FieldLabel>
            <Textarea id="sv-copy" rows={3} value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="El texto del post con #publi, menciones y hashtags" />
            <FieldDescription>La marca lo aprueba junto al {esVideo ? "vídeo" : "contenido"}.</FieldDescription>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => cerrar(false)}>
            Cancelar
          </Button>
          <Button onClick={subir} disabled={archivos.length === 0 || subiendo}>
            <UploadIcon /> {subiendo ? "Subiendo…" : "Subir como borrador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
