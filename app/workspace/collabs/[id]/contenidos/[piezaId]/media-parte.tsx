"use client"

import * as React from "react"
import { toast } from "sonner"
import { ExternalLinkIcon, MegaphoneIcon, MinusIcon, PlusIcon, SendIcon, UploadIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { TIPOS_PIEZA, type Pieza, type Version } from "@/lib/influencer/modelo"
import { nombreDeParte, ultimaVersion } from "@/lib/influencer/collabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { VisorMedia } from "@/components/influencer/visor-media"
import { Conversacion, segundos } from "@/components/influencer/conversacion"
import { CompartirEnlaceDialog } from "@/components/influencer/compartir-enlace"
import { ZonaSubida } from "@/components/influencer/zona-subida"
import { BotonPanel, EnlaceRevisionBoton, VersionesTabs, situacionDe } from "./barra-versiones"
import { SubirVersionDialog } from "./subir-version-dialog"
import { PublicarDialog } from "./publicar-dialog"
import type { AccionesPieza } from "./use-pieza"

const ZOOM = { min: 50, max: 200, paso: 25 }

/**
 * El vídeo o las fotos de una pieza, como la revisión de Feedback: las versiones arriba, comparar
 * con la anterior y zoom; el contenido sobre el lienzo con las notas de la marca en su sitio; el
 * copy debajo y la conversación a la derecha.
 */
export function MediaParte({ acciones }: { acciones: AccionesPieza & { pieza: Pieza } }) {
  const { pieza, collab, hoy, crearVersion, cambiarVersion, enviarARevision, resolverNota, responderNota, escribir, publicar } = acciones
  const medio = TIPOS_PIEZA[pieza.tipo].media ?? "imagen"
  const nombre = nombreDeParte(pieza, "media")
  const versiones = pieza.media
  const ultima = ultimaVersion(versiones)
  const [versionId, setVersionId] = React.useState<string | null>(null)
  const [comparar, setComparar] = React.useState(false)
  const [zoom, setZoom] = React.useState(100)
  const [panel, setPanel] = React.useState(true)
  const [nota, setNota] = React.useState<string | null>(null)
  const [subir, setSubir] = React.useState(false)
  const [publicando, setPublicando] = React.useState(false)
  const [enviada, setEnviada] = React.useState<Version | null>(null)
  const version = versiones.find((v) => v.id === versionId) ?? ultima
  const anterior = version ? (versiones.find((v) => v.numero === version.numero - 1) ?? null) : null
  const esUltima = version?.id === ultima?.id
  const contacto = collab.brief.contacto

  const accion = () => {
    if (!version) return <Button size="sm" onClick={() => setSubir(true)}><UploadIcon /> Subir {medio === "video" ? "el vídeo" : "las fotos"}</Button>
    if (!esUltima) return null
    if (version.estado === "borrador") return <Button size="sm" onClick={() => { const v = enviarARevision("media", version); if (v) setEnviada(v) }}><SendIcon /> Enviar a revisión</Button>
    if (version.estado === "cambios") return <Button size="sm" onClick={() => setSubir(true)}><UploadIcon /> Subir la v{version.numero + 1}</Button>
    if (version.estado === "aprobada" && !pieza.publicada) return <Button size="sm" onClick={() => setPublicando(true)}><MegaphoneIcon /> Marcar como publicada</Button>
    if (pieza.publicada)
      return (
        <Button size="sm" variant="outline" asChild>
          <a href={pieza.publicada.url} target="_blank" rel="noreferrer">
            <ExternalLinkIcon /> Publicada el {fmt.date(pieza.publicada.fecha)}
          </a>
        </Button>
      )
    return null
  }

  const archivo = version?.archivos?.[0]

  return (
    <div className={cn("grid gap-4", panel && "xl:grid-cols-[minmax(0,1fr)_360px]")}>
      <section className="flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <VersionesTabs versiones={versiones} activa={version?.id ?? null} onElegir={(id) => { setVersionId(id); setNota(null) }} />
          {anterior && (
            <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm">
              <Switch checked={comparar} onCheckedChange={setComparar} aria-label="Comparar con la anterior" /> Comparar con la anterior
            </label>
          )}
          {version && (
            <div className="flex items-center rounded-lg border">
              <Button variant="ghost" size="icon-sm" aria-label="Alejar" disabled={zoom <= ZOOM.min} onClick={() => setZoom((z) => Math.max(ZOOM.min, z - ZOOM.paso))}>
                <MinusIcon />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums">{zoom} %</span>
              <Button variant="ghost" size="icon-sm" aria-label="Acercar" disabled={zoom >= ZOOM.max} onClick={() => setZoom((z) => Math.min(ZOOM.max, z + ZOOM.paso))}>
                <PlusIcon />
              </Button>
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {version && esUltima && version.estado === "en-revision" && (
              <Button variant="ghost" size="sm" onClick={() => setSubir(true)}>
                <UploadIcon /> Subir otra versión
              </Button>
            )}
            {version && <EnlaceRevisionBoton version={version} pieza={pieza} contacto={contacto} />}
            {accion()}
            <BotonPanel abierto={panel} onCambiar={() => setPanel((p) => !p)} pendientes={version?.notas.filter((n) => !n.resuelta).length ?? 0} />
          </div>
        </div>

        {!version ? (
          <div className="grid flex-1 place-items-center p-8">
            <div className="w-full max-w-lg text-center">
              <ZonaSubida onArchivos={() => setSubir(true)} titulo={medio === "video" ? "Sube el vídeo desde el móvil o el ordenador" : "Sube las fotos"} ayuda={pieza.guion.length > 0 && !pieza.guion.some((v) => v.estado === "aprobada") ? "El guion aún no está aprobado: puedes subirlo igualmente." : "Se sube como borrador; la marca no lo ve hasta que lo envías."} />
            </div>
          </div>
        ) : (
          <>
            <VisorMedia
              version={version}
              anterior={comparar ? anterior : null}
              medio={medio}
              notas={version.notas}
              seleccionada={nota}
              onSeleccionar={(id) => {
                setNota(id)
                setPanel(true)
              }}
              zoom={zoom}
              tint={collab.tint}
              className="min-h-[460px] flex-1"
            />
            <div className="grid gap-3 border-t px-4 py-3 text-xs text-muted-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="min-w-0">
                <p className="text-foreground">{situacionDe(version, contacto.nombre, hoy)}</p>
                {archivo && (
                  <p className="mt-0.5 truncate">
                    {version.archivos && version.archivos.length > 1 ? `${version.archivos.length} fotos · ` : `${archivo.nombre} · `}
                    {fmt.bytes((version.archivos ?? []).reduce((a, x) => a + x.tamano, 0))}
                    {archivo.duracion ? ` · ${segundos(archivo.duracion)}` : ""}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <p className="mb-1 font-medium text-foreground">Copy de la publicación</p>
                {version.estado === "borrador" ? (
                  <Textarea value={version.copy ?? ""} onChange={(e) => cambiarVersion("media", version.id, (v) => ({ ...v, copy: e.target.value }))} rows={2} placeholder="El texto del post con #publi, menciones y hashtags" className="text-sm" />
                ) : (
                  <p className="text-sm text-foreground">{version.copy || "Sin copy"}</p>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {panel && (
        <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
          {version ? (
            <Conversacion
              notas={version.notas}
              mensajes={version.mensajes}
              lado="influencer"
              seleccionada={nota}
              onSeleccionar={setNota}
              onResolver={(id) => resolverNota("media", version.id, id)}
              onResponder={(id, texto) => responderNota("media", version.id, id, texto)}
              onEnviar={(texto) => escribir("media", version.id, texto)}
              placeholder={`Escribe a ${contacto.nombre.split(" ")[0] || "la marca"}…`}
              className="flex-1"
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Las notas de la marca aparecen aquí: en el segundo del vídeo o en el punto de la foto.</p>
          )}
        </section>
      )}

      <SubirVersionDialog
        open={subir}
        onOpenChange={setSubir}
        pieza={pieza}
        numero={versiones.length + 1}
        copyAnterior={ultima?.copy}
        onSubir={({ archivos, copy }) => {
          const v = crearVersion("media", { archivos, copy })
          if (!v) return
          setVersionId(v.id)
          if (!pieza.portadaUrl && archivos[0]?.url) acciones.cambiarPieza({ portadaUrl: archivos[0].url })
          toast.success(`${nombre} v${v.numero} subido como borrador: revísalo y envíalo cuando esté`)
        }}
      />
      <PublicarDialog
        open={publicando}
        onOpenChange={setPublicando}
        hoy={hoy}
        onPublicar={(p) => {
          publicar(p)
          toast.success("Publicada: en 7 días toca apuntar los resultados")
        }}
      />
      {enviada?.enlace && (
        <CompartirEnlaceDialog
          open
          onOpenChange={(o) => !o && setEnviada(null)}
          titulo={`${nombre} v${enviada.numero} enviado a revisión`}
          descripcion={`Mándale el enlace a ${contacto.nombre || "la marca"}: lo ve, marca sus notas sobre el ${medio === "video" ? "vídeo" : "contenido"} y lo aprueba sin cuenta.`}
          ruta={`/revisar/${enviada.enlace.token}`}
          mensaje={`Hola ${contacto.nombre.split(" ")[0] || ""}, aquí tienes la v${enviada.numero} de «${pieza.titulo}» para revisar:`}
          asunto={`${pieza.titulo} · v${enviada.numero} para revisar`}
          email={contacto.email}
        />
      )}
    </div>
  )
}
