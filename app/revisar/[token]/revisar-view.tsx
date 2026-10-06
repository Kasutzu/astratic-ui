"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRightIcon, CheckIcon, DownloadIcon, MessageSquareWarningIcon, MinusIcon, PlusIcon, ShieldCheckIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_VERSION, TIPOS_PIEZA, estadoDe, type AnclaNota, type Collab, type Comentario, type Marca, type Perfil, type Pieza, type TipoVersion, type Version } from "@/lib/influencer/modelo"
import { etiquetaDePieza, nombreDeParte, redDePieza } from "@/lib/influencer/collabs"
import { idNuevo } from "@/lib/influencer/tareas"
import { tintClass } from "@/lib/influencer/tints"
import { socialLabel } from "@/components/app/social-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { PaginaMarca } from "@/components/influencer/pagina-marca"
import { EditorTexto } from "@/components/influencer/editor-texto"
import { VisorMedia } from "@/components/influencer/visor-media"
import { Conversacion } from "@/components/influencer/conversacion"
import { useBorrador } from "@/components/influencer/navegador"

export type DatosRevision = { collab: Collab; pieza: Pieza; version: Version; tipo: TipoVersion; marca: Marca }
export type Pendiente = { token: string; titulo: string; tipo: TipoVersion; portadaUrl?: string }

const ZOOM = { min: 50, max: 200, paso: 25 }

function Revision({ datos, perfil, hoy, pendientes, token }: { datos: DatosRevision; perfil: Perfil; hoy: string; pendientes: Pendiente[]; token: string }) {
  const { collab, pieza, tipo, marca } = datos
  const [version, setVersion] = React.useState(datos.version)
  const [viendoId, setViendoId] = React.useState(datos.version.id)
  const [autor, setAutor] = React.useState(collab.brief.contacto.nombre)
  const [ancla, setAncla] = React.useState<AnclaNota | null>(null)
  const [nota, setNota] = React.useState<string | null>(null)
  const [comparar, setComparar] = React.useState(false)
  const [zoom, setZoom] = React.useState(100)
  const [aprobando, setAprobando] = React.useState(false)
  const anteriores = pieza[tipo].filter((v) => v.numero < version.numero)
  const viendo = viendoId === version.id ? version : (anteriores.find((v) => v.id === viendoId) ?? version)
  const esActual = viendo.id === version.id
  const cerrada = version.estado === "aprobada" || version.estado === "cambios"
  const estado = estadoDe(ESTADOS_VERSION, version.estado)
  const red = redDePieza(pieza)
  const medio = TIPOS_PIEZA[pieza.tipo].media
  const parte = nombreDeParte(pieza, tipo)
  const i = pendientes.findIndex((p) => p.token === token)
  const siguiente = pendientes.find((p, j) => j > i) ?? pendientes.find((p) => p.token !== token)

  const comentario = (texto: string): Comentario => ({ id: idNuevo("cm"), autor: autor.trim() || "Marca", lado: "marca", el: hoy, texto })

  const enviar = (texto: string, a?: AnclaNota) => {
    setVersion((v) => ({ ...v, notas: [...v.notas, { ...comentario(texto), ancla: a, resuelta: false, respuestas: [] }] }))
    toast.success("Nota añadida")
  }

  const pedirCambios = () => {
    if (version.notas.length === 0) return toast("Deja al menos una nota para pedir cambios")
    setVersion((v) => ({ ...v, estado: "cambios" }))
    toast.success(`${perfil.nombrePila} recibe tus notas y prepara la v${version.numero + 1}`)
  }

  const aprobar = () => {
    setVersion((v) => ({ ...v, estado: "aprobada", aprobada: { por: autor.trim() || "Marca", el: hoy } }))
    setAprobando(false)
    toast.success(`v${version.numero} aprobada`)
  }

  const notasVistas = esActual ? version.notas : viendo.notas
  const marcasTexto = notasVistas.flatMap((n, j) => (n.ancla?.tipo === "texto" ? [{ id: n.id, numero: j + 1, cita: n.ancla.cita, resuelta: n.resuelta }] : []))

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
            {marca.nombre} · {collab.campana}
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-[27px] leading-tight font-semibold tracking-tight">
            {pieza.titulo}
            <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {parte} v{version.numero} · {etiquetaDePieza(pieza)}
            {red ? ` para ${socialLabel[red]}` : ""} · enviada el {fmt.date(version.creadaEl)} · publicar el {fmt.date(pieza.publicacion)}
          </p>
        </div>
        {!cerrada && esActual && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={pedirCambios}>
              <MessageSquareWarningIcon /> Pedir cambios
            </Button>
            <Button onClick={() => setAprobando(true)}>
              <CheckIcon /> Aprobar v{version.numero}
            </Button>
          </div>
        )}
      </div>

      {version.aprobada && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          <ShieldCheckIcon className="size-4 flex-none" />
          Aprobada por {version.aprobada.por} el {fmt.date(version.aprobada.el)} a las {fmt.time(version.aprobada.el)}. {perfil.nombrePila} ya puede {tipo === "guion" ? "grabar" : "programar la publicación"}.
        </p>
      )}
      {version.estado === "cambios" && (
        <p className="flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <MessageSquareWarningIcon className="size-4 flex-none" />
          Cambios pedidos: {perfil.nombrePila} tiene tus notas y subirá la v{version.numero + 1}. Este enlace enseñará la nueva.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-[600px] min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
            {anteriores.length > 0 && (
              <div role="tablist" aria-label="Versiones" className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-muted p-[3px]">
                {[...anteriores, version].map((v) => (
                  <button key={v.id} type="button" role="tab" aria-selected={viendo.id === v.id} onClick={() => setViendoId(v.id)} className={cn("h-full rounded-md px-2.5 text-sm font-medium", viendo.id === v.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    v{v.numero}
                  </button>
                ))}
              </div>
            )}
            {medio && anteriores.length > 0 && (
              <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm">
                <Switch checked={comparar} onCheckedChange={setComparar} aria-label="Comparar con la anterior" /> Comparar con la anterior
              </label>
            )}
            {tipo === "media" && (
              <div className="flex items-center rounded-lg border">
                <Button variant="ghost" size="icon-sm" aria-label="Alejar" disabled={zoom <= ZOOM.min} onClick={() => setZoom((z) => z - ZOOM.paso)}>
                  <MinusIcon />
                </Button>
                <span className="w-12 text-center text-xs tabular-nums">{zoom} %</span>
                <Button variant="ghost" size="icon-sm" aria-label="Acercar" disabled={zoom >= ZOOM.max} onClick={() => setZoom((z) => z + ZOOM.paso)}>
                  <PlusIcon />
                </Button>
              </div>
            )}
            <p className="ml-auto text-xs text-muted-foreground">{!esActual ? "Versión anterior: solo para comparar" : cerrada ? "" : tipo === "guion" ? "Selecciona un trozo de texto para dejar una nota ahí" : medio === "video" ? "Pulsa en la línea de tiempo para dejar una nota en ese segundo" : "Pulsa en la foto para dejar una nota en ese punto"}</p>
          </div>

          {tipo === "guion" ? (
            <EditorTexto value={viendo.texto ?? ""} editable={false} notas={marcasTexto} notaSeleccionada={nota} onSeleccionarNota={setNota} onCitar={esActual && !cerrada ? (cita) => setAncla({ tipo: "texto", cita }) : undefined} className="flex-1" contenidoClassName="min-h-[480px] px-8 py-6" />
          ) : (
            <VisorMedia version={viendo} anterior={comparar && esActual ? (anteriores[anteriores.length - 1] ?? null) : null} medio={medio ?? "imagen"} notas={notasVistas} seleccionada={nota} onSeleccionar={setNota} onMarcar={esActual && !cerrada ? setAncla : undefined} marcaPendiente={ancla} zoom={zoom} tint={collab.tint} className="min-h-[460px] flex-1" />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="size-3.5 text-success" /> Revisada por {perfil.nombrePila} antes de enviártela
            </span>
            {tipo === "media" && viendo.copy && (
              <span className="min-w-0 flex-1 basis-full text-sm text-foreground">
                <span className="text-xs font-medium text-muted-foreground">Copy: </span>
                {viendo.copy}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5">
              <DownloadIcon className="size-3.5" /> {version.estado === "aprobada" ? (tipo === "guion" ? "Descarga el texto en PDF desde el navegador" : "La descarga de la final ya está disponible") : "La descarga de la final se activa al aprobarla"}
            </span>
          </div>
        </section>

        <section className="flex min-h-[600px] min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
            Comentas como
            <Input value={autor} onChange={(e) => setAutor(e.target.value)} aria-label="Tu nombre" className="h-7 flex-1 text-xs" />
          </div>
          <Conversacion
            notas={notasVistas}
            mensajes={esActual ? version.mensajes : viendo.mensajes}
            lado="marca"
            seleccionada={nota}
            onSeleccionar={setNota}
            onResponder={esActual ? (id, texto) => setVersion((v) => ({ ...v, notas: v.notas.map((n) => (n.id === id ? { ...n, respuestas: [...n.respuestas, comentario(texto)] } : n)) })) : undefined}
            onEnviar={esActual && !cerrada ? enviar : undefined}
            anclaPendiente={ancla}
            onQuitarAncla={() => setAncla(null)}
            cerrada={cerrada || !esActual}
            className="flex-1"
          />
          {siguiente && (
            <Link href={`/revisar/${siguiente.token}`} className="flex items-center gap-3 border-t px-4 py-3 transition-colors hover:bg-muted">
              <span className={cn("relative h-12 w-9 flex-none overflow-hidden rounded-md", tintClass[collab.tint])}>{siguiente.portadaUrl && <Image src={siguiente.portadaUrl} alt="" fill sizes="36px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">Siguiente por revisar</span>
                <span className="block truncate text-sm font-medium">{siguiente.titulo}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                Siguiente <ArrowRightIcon className="size-4" />
              </span>
            </Link>
          )}
        </section>
      </div>

      <Dialog open={aprobando} onOpenChange={setAprobando}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Aprobar la v{version.numero}</DialogTitle>
            <DialogDescription>Queda registrado con tu nombre, la fecha y la hora. {perfil.nombrePila} recibe el aviso al momento.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="rv-nombre">Tu nombre</FieldLabel>
            <Input id="rv-nombre" value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Nombre y apellidos" autoFocus />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAprobando(false)}>
              Cancelar
            </Button>
            <Button onClick={aprobar} disabled={!autor.trim()}>
              <CheckIcon /> Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Lo que ve la marca al abrir un enlace de revisión, sin cuenta: la pieza (guion, vídeo o fotos) con
 * sus versiones, las notas en su sitio, la conversación y aprobar o pedir cambios. Lo que llega del
 * servidor o, si se acaba de enviar desde el workspace, lo guardado en el navegador.
 */
export function RevisarView({ token, inicial, perfil, hoy, pendientes }: { token: string; inicial: DatosRevision | null; perfil: Perfil; hoy: string; pendientes: Pendiente[] }) {
  const datos = useBorrador<DatosRevision | null>(`revision:${token}`, inicial)
  if (!datos) return <main className="grid min-h-screen place-items-center p-6"><EmptyState title="Este enlace no existe o ha caducado" description="Pide uno nuevo a quien te lo mandó." /></main>
  return (
    <PaginaMarca seccion="Revisión de contenido" marca={datos.marca.nombre} perfil={perfil} ancho="ancho" pie={`Enlace privado para ${datos.marca.nombre}, sin cuenta. Caduca el ${fmt.date(datos.version.enlace?.caduca ?? hoy)}.`}>
      <Revision key={token} datos={datos} perfil={perfil} hoy={hoy} pendientes={pendientes} token={token} />
    </PaginaMarca>
  )
}
