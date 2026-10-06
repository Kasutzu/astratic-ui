"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeftIcon, CalendarCheckIcon, CopyIcon, ExternalLinkIcon, FilePlus2Icon, LinkIcon, MailIcon, MegaphoneIcon, MessageCircleIcon, SendIcon, ShieldCheckIcon, UploadIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_PIEZA, ESTADOS_VERSION, estadoDe, type Collab, type Marca, type Pieza, type TipoVersion, type Version } from "@/lib/influencer/modelo"
import { diasEsperando, siguientePasoDePieza, ultimaVersion } from "@/lib/influencer/collabs"
import { idNuevo } from "@/lib/influencer/tareas"
import { soloFecha, sumarDias } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { Block, BlockHeader } from "@/components/influencer/block"
import { GuionViewer } from "@/components/influencer/guion-viewer"
import { VideoViewer } from "@/components/influencer/video-viewer"
import { NotesPanel } from "@/components/influencer/notes-panel"

const DIAS_ENLACE = 30
const DURACION_POR_DEFECTO = 30

/**
 * La página de una pieza: el guion y el vídeo con sus versiones apiladas, las notas de la marca en
 * su sitio, el enlace de revisión sin cuenta y la aprobación registrada. Es la página que más se cuida.
 */
export function PiezaView({ hoy, collab, pieza: inicial, marca }: { hoy: string; collab: Collab; pieza: Pieza; marca: Marca }) {
  const [pieza, setPieza] = React.useState(inicial)
  const [tipo, setTipo] = React.useState<TipoVersion>(inicial.video.length > 0 || inicial.guion.some((v) => v.estado === "aprobada") ? "video" : "guion")
  const [versionId, setVersionId] = React.useState<string | null>(null)
  const [notaSeleccionada, setNotaSeleccionada] = React.useState<string | null>(null)
  const [editor, setEditor] = React.useState<{ abierto: boolean; texto: string }>({ abierto: false, texto: "" })
  const [subida, setSubida] = React.useState<{ abierta: boolean; archivo: File | null }>({ abierta: false, archivo: null })

  const versiones = pieza[tipo]
  const ultima = ultimaVersion(versiones)
  const version = versiones.find((v) => v.id === versionId) ?? ultima
  const estado = estadoDe(ESTADOS_PIEZA, pieza.estado)
  const hoyFecha = soloFecha(hoy)

  const actualizarVersion = (id: string, cambios: Partial<Version> | ((v: Version) => Version)) =>
    setPieza((p) => ({ ...p, [tipo]: p[tipo].map((v) => (v.id === id ? (typeof cambios === "function" ? cambios(v) : { ...v, ...cambios }) : v)) }))

  const crearVersion = (datos: Partial<Version>) => {
    const numero = versiones.length + 1
    const nueva: Version = { id: idNuevo(`${pieza.id}-${tipo[0]}`), tipo, numero, estado: "borrador", creadaEl: hoy, notas: [], ...datos }
    setPieza((p) => ({ ...p, [tipo]: [...p[tipo], nueva], estado: "borrador", rondaActual: tipo === "video" && numero > 1 ? p.rondaActual + 1 : p.rondaActual }))
    setVersionId(nueva.id)
    toast.success(`${tipo === "guion" ? "Guion" : "Vídeo"} v${numero} creado como borrador`)
  }

  const enviarARevision = async (v: Version) => {
    const token = `rv-${pieza.id}-${tipo[0]}${v.numero}`
    actualizarVersion(v.id, { estado: "en-revision", enlace: { token, caduca: sumarDias(hoyFecha, DIAS_ENLACE) } })
    setPieza((p) => ({ ...p, estado: "en-revision" }))
    await copiar(absoluto(`/revisar/${token}`))
    toast.success("Enviado a revisión: el enlace está copiado para mandárselo a la marca")
  }

  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto)
  }

  const resolver = (id: string) =>
    actualizarVersion(version?.id ?? "", (v) => ({ ...v, notas: v.notas.map((n) => (n.id === id ? { ...n, resuelta: !n.resuelta } : n)) }))

  const responder = (id: string, texto: string) => actualizarVersion(version?.id ?? "", (v) => ({ ...v, notas: v.notas.map((n) => (n.id === id ? { ...n, respuesta: texto } : n)) }))

  const marcarPublicada = () => {
    setPieza((p) => ({ ...p, estado: "publicado", publicada: { url: "", fecha: hoyFecha, marcadaPubli: true } }))
    toast.success("Pieza publicada: en 7 días te toca mandar los resultados")
  }

  // La ruta se pinta relativa (misma salida en servidor y cliente); el dominio se añade al copiar o compartir.
  const enlace = version?.enlace ? `/revisar/${version.enlace.token}` : null
  const absoluto = (ruta: string) => `${window.location.origin}${ruta}`
  const esperando = version ? diasEsperando(version, hoyFecha) : 0
  const rondas = `Ronda ${pieza.rondaActual} de ${collab.brief.rondasIncluidas} incluidas`

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_372px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Block>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link href={`/workspace/collabs/${collab.id}/contenidos`}>
                <ArrowLeftIcon /> Contenidos
              </Link>
            </Button>
            {/* En móvil el título baja a su propia línea: con el botón de volver al lado no cabe. */}
            <div className="order-last min-w-0 basis-full md:order-none md:flex-1 md:basis-auto">
              <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight">
                {pieza.titulo}
                <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
              </h2>
              <p className="text-xs text-muted-foreground">
                {siguientePasoDePieza(pieza)} · publicar el {fmt.date(pieza.publicacion)} · {rondas}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {tipo === "guion" ? (
                <Button variant="outline" size="sm" onClick={() => setEditor({ abierto: true, texto: ultima?.texto ?? "" })}>
                  <FilePlus2Icon /> {ultima ? "Nueva versión" : "Escribir el guion"}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSubida({ abierta: true, archivo: null })}>
                  <UploadIcon /> {ultima ? "Subir nueva versión" : "Subir el vídeo"}
                </Button>
              )}
              {version?.estado === "borrador" && (
                <Button size="sm" onClick={() => enviarARevision(version)}>
                  <SendIcon /> Enviar a revisión
                </Button>
              )}
              {tipo === "video" && version?.estado === "aprobada" && !pieza.publicada && (
                <Button size="sm" onClick={marcarPublicada}>
                  <MegaphoneIcon /> Marcar como publicada
                </Button>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Tabs
              value={tipo}
              onValueChange={(v) => {
                setTipo(v as TipoVersion)
                setVersionId(null)
                setNotaSeleccionada(null)
              }}
            >
              <TabsList>
                <TabsTrigger value="guion">
                  Guion {pieza.guion.length > 0 && <span className="text-muted-foreground">v{pieza.guion.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="video">
                  Vídeo {pieza.video.length > 0 && <span className="text-muted-foreground">v{pieza.video.length}</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {versiones.length > 0 && (
              <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Versiones">
                {versiones.map((v) => {
                  const e = estadoDe(ESTADOS_VERSION, v.estado)
                  const activa = v.id === version?.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="tab"
                      aria-selected={activa}
                      onClick={() => {
                        setVersionId(v.id)
                        setNotaSeleccionada(null)
                      }}
                      className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors", activa ? "border-brand bg-brand-soft text-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground")}
                    >
                      v{v.numero}
                      <span className={cn("size-1.5 rounded-full", e.tone === "success" ? "bg-success" : e.tone === "warning" ? "bg-warning" : e.tone === "info" ? "bg-info" : "bg-muted-foreground/50")} />
                      <span className="font-normal">{fmt.date(v.creadaEl)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {!version ? (
            <EmptyState
              icon={tipo === "guion" ? FilePlus2Icon : UploadIcon}
              title={tipo === "guion" ? "Sin guion todavía" : "Sin vídeo todavía"}
              description={tipo === "guion" ? "Escríbelo con la plantilla: gancho, desarrollo, mensajes de la marca, llamada a la acción, texto en pantalla y copy." : pieza.guion.some((v) => v.estado === "aprobada") ? "El guion está aprobado: graba y sube la V1 desde el móvil." : "Primero se aprueba el guion; después se sube el vídeo."}
              action={
                tipo === "guion" ? (
                  <Button size="sm" onClick={() => setEditor({ abierto: true, texto: "" })}>
                    <FilePlus2Icon /> Escribir el guion
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setSubida({ abierta: true, archivo: null })}>
                    <UploadIcon /> Subir el vídeo
                  </Button>
                )
              }
            />
          ) : tipo === "guion" ? (
            <GuionViewer texto={version.texto ?? ""} notas={version.notas} seleccionada={notaSeleccionada} onSeleccionar={setNotaSeleccionada} />
          ) : (
            <VideoViewer version={version} notas={version.notas} tint={collab.tint} seleccionada={notaSeleccionada} onSeleccionar={setNotaSeleccionada} />
          )}
        </Block>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Block>
          <BlockHeader title={version ? `Notas · v${version.numero}` : "Notas"} count={version?.notas.filter((n) => !n.resuelta).length} />
          {version ? (
            <NotesPanel notas={version.notas} modo="influencer" seleccionada={notaSeleccionada} onSeleccionar={setNotaSeleccionada} onResolver={resolver} onResponder={responder} />
          ) : (
            <p className="text-sm text-muted-foreground">Las notas de la marca aparecen aquí, cada una en su sitio del guion o del vídeo.</p>
          )}
        </Block>

        <Block>
          <BlockHeader title="Enlace para la marca" />
          {version && enlace ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input readOnly value={enlace} className="h-8 font-mono text-xs" aria-label="Enlace de revisión" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await copiar(absoluto(enlace))
                    toast.success("Enlace copiado")
                  }}
                >
                  <CopyIcon /> Copiar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Hola ${collab.brief.contacto.nombre.split(" ")[0] || ""}, aquí tienes la v${version.numero} para revisar: ${enlace}`)}`} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${collab.brief.contacto.nombre.split(" ")[0] || ""}, aquí tienes la v${version.numero} para revisar: ${absoluto(enlace)}`)}`, "_blank", "noopener") }}>
                    <MessageCircleIcon /> WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${collab.brief.contacto.email}?subject=${encodeURIComponent(`${pieza.titulo} · v${version.numero} para revisar`)}&body=${encodeURIComponent(enlace)}`} onClick={(e) => { e.preventDefault(); window.location.href = `mailto:${collab.brief.contacto.email}?subject=${encodeURIComponent(`${pieza.titulo} · v${version.numero} para revisar`)}&body=${encodeURIComponent(absoluto(enlace))}` }}>
                    <MailIcon /> Email
                  </a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/revisar/${version.enlace?.token}`} target="_blank">
                    <ExternalLinkIcon /> Ver como la marca
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sin cuenta: {marca.nombre} lee, comenta y aprueba. Caduca el {fmt.date(version.enlace?.caduca ?? hoy)}.
                {esperando > 0 && ` Lleva ${esperando} ${esperando === 1 ? "día" : "días"} esperando respuesta.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <LinkIcon className="mt-0.5 size-4 flex-none" />
                {version ? "Esta versión aún no se ha enviado: al enviarla a revisión se crea el enlace." : "El enlace se crea al enviar una versión a revisión."}
              </p>
            </div>
          )}
        </Block>

        <Block>
          <BlockHeader title="Aprobación" />
          <ul className="flex flex-col gap-2 text-sm">
            {(["guion", "video"] as TipoVersion[]).map((t) => {
              const v = ultimaVersion(pieza[t])
              const e = v ? estadoDe(ESTADOS_VERSION, v.estado) : null
              return (
                <li key={t} className="flex items-start gap-2.5">
                  <ShieldCheckIcon className={cn("mt-0.5 size-4 flex-none", v?.aprobada ? "text-success" : "text-muted-foreground/50")} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{t === "guion" ? "Guion" : "Vídeo"}</span>
                    {v && e ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · v{v.numero} {e.label.toLowerCase()}
                        {v.aprobada && ` por ${v.aprobada.por} el ${fmt.date(v.aprobada.el)} a las ${fmt.time(v.aprobada.el)}`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground"> · sin versiones</span>
                    )}
                  </span>
                </li>
              )
            })}
            {pieza.publicada && (
              <li className="flex items-start gap-2.5">
                <CalendarCheckIcon className="mt-0.5 size-4 flex-none text-success" />
                <span>
                  <span className="font-medium">Publicada</span>
                  <span className="text-muted-foreground"> · {fmt.date(pieza.publicada.fecha)}{pieza.publicada.marcadaPubli ? " · marcada como publicidad" : ""}</span>
                </span>
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Queda registrado quién aprobó qué versión y cuándo: es lo que vale si luego hay discusión. {rondas}.</p>
        </Block>
      </div>

      <Dialog open={editor.abierto} onOpenChange={(o) => setEditor((e) => ({ ...e, abierto: o }))}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{ultima ? `Guion v${versiones.length + 1}` : "Guion"}</DialogTitle>
            <DialogDescription>Gancho, desarrollo, mensajes de la marca, llamada a la acción, texto en pantalla, copy del post y notas de rodaje. Los títulos en mayúsculas se convierten en apartados.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!editor.texto.trim()) return
              crearVersion({ texto: editor.texto.trim() })
              setEditor({ abierto: false, texto: "" })
            }}
            className="grid gap-4"
          >
            <Field>
              <FieldLabel htmlFor="guion-texto">Texto</FieldLabel>
              <Textarea id="guion-texto" rows={16} value={editor.texto} onChange={(e) => setEditor((x) => ({ ...x, texto: e.target.value }))} placeholder={"GANCHO (0–3 s)\n…\n\nDESARROLLO\n…"} className="font-mono text-[13px]" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditor({ abierto: false, texto: "" })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!editor.texto.trim()}>
                Guardar borrador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={subida.abierta} onOpenChange={(o) => setSubida((s) => ({ ...s, abierta: o }))}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{ultima ? `Vídeo v${versiones.length + 1}` : "Subir el vídeo"}</DialogTitle>
            <DialogDescription>MP4 o MOV. La subida aguanta cortes de red y enseña el progreso; un reel puede pasar de 100 MB.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const archivo = subida.archivo
              if (!archivo) return
              crearVersion({ archivo: { nombre: archivo.name, tamano: archivo.size, duracion: DURACION_POR_DEFECTO, posterUrl: pieza.portadaUrl } })
              setSubida({ abierta: false, archivo: null })
            }}
            className="grid gap-4"
          >
            <Field>
              <FieldLabel htmlFor="video-archivo">Archivo</FieldLabel>
              <Input id="video-archivo" type="file" accept="video/mp4,video/quicktime" onChange={(e) => setSubida((s) => ({ ...s, archivo: e.target.files?.[0] ?? null }))} />
              {subida.archivo && (
                <p className="text-xs text-muted-foreground">
                  {subida.archivo.name} · {fmt.bytes(subida.archivo.size)}
                </p>
              )}
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSubida({ abierta: false, archivo: null })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!subida.archivo}>
                <UploadIcon /> Subir como borrador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
