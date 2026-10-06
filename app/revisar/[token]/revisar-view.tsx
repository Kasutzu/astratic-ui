"use client"

import * as React from "react"
import Image from "next/image"
import { toast } from "sonner"
import { CheckIcon, MessageSquareWarningIcon, ShieldCheckIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_VERSION, FORMATOS, estadoDe, type AnclaNota, type Collab, type Marca, type Perfil, type Pieza, type TipoVersion, type Version } from "@/lib/influencer/modelo"
import { idNuevo } from "@/lib/influencer/tareas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { StatusBadge } from "@/components/app/status-badge"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Block, BlockHeader } from "@/components/influencer/block"
import { GuionViewer } from "@/components/influencer/guion-viewer"
import { VideoViewer } from "@/components/influencer/video-viewer"
import { NotesPanel } from "@/components/influencer/notes-panel"
import { ThemeBody } from "@/components/influencer/theme-body"

export function RevisarView({ hoy, perfil, collab, pieza, version: inicial, tipo, marca }: { hoy: string; perfil: Perfil; collab: Collab; pieza: Pieza; version: Version; tipo: TipoVersion; marca: Marca }) {
  const [version, setVersion] = React.useState(inicial)
  const [autor, setAutor] = React.useState(collab.brief.contacto.nombre)
  const [seleccionada, setSeleccionada] = React.useState<string | null>(null)
  const [ancla, setAncla] = React.useState<AnclaNota | null>(null)
  const [aprobando, setAprobando] = React.useState(false)
  const [viendo, setViendo] = React.useState<Version>(inicial)
  const anteriores = pieza[tipo].filter((v) => v.numero < inicial.numero)
  const estado = estadoDe(ESTADOS_VERSION, version.estado)
  const esActual = viendo.id === version.id
  const cerrada = version.estado === "aprobada" || version.estado === "cambios"
  const red = FORMATOS[pieza.formato].red

  const nuevaNota = (texto: string, anclaNota?: AnclaNota) => {
    const nombre = autor.trim() || "Marca"
    setVersion((v) => ({ ...v, notas: [...v.notas, { id: idNuevo("n"), autor: nombre, el: hoy, texto, ancla: anclaNota, resuelta: false }] }))
    toast.success("Nota añadida")
  }

  const pedirCambios = () => {
    if (version.notas.length === 0) {
      toast("Deja al menos una nota para pedir cambios")
      return
    }
    setVersion((v) => ({ ...v, estado: "cambios" }))
    toast.success(`${perfil.nombrePila} recibe tus ${version.notas.length === 1 ? "nota" : "notas"} y sube la siguiente versión`)
  }

  const aprobar = () => {
    const nombre = autor.trim() || "Marca"
    setVersion((v) => ({ ...v, estado: "aprobada", aprobada: { por: nombre, el: hoy } }))
    setAprobando(false)
    toast.success(`v${version.numero} aprobada`)
  }

  return (
    <div className="theme-influencer min-h-screen bg-background text-foreground">
      <ThemeBody />
      <header className="flex h-14 items-center gap-3 border-b bg-card px-4 md:px-8">
        <span className="grid size-7 place-items-center rounded-lg bg-foreground text-xs font-semibold text-background">A</span>
        <span className="text-sm font-semibold">Revisión de contenido</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">· Astratic Network</span>
        <span className="ml-auto flex items-center gap-2 text-sm">
          <span className="relative size-7 overflow-hidden rounded-full bg-muted">
            <Image src={perfil.fotoUrl} alt="" fill sizes="28px" className="object-cover" />
          </span>
          <span className="hidden sm:inline">{perfil.nombre}</span>
          <ThemeToggle />
        </span>
      </header>

      <main className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {marca.nombre} · {collab.campana}
            </p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-[27px] leading-tight font-semibold tracking-tight">
              {pieza.titulo}
              <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tipo === "guion" ? "Guion" : "Vídeo"} v{version.numero} · {FORMATOS[pieza.formato].label}
              {red ? ` para ${red === "instagram" ? "Instagram" : red === "tiktok" ? "TikTok" : "YouTube"}` : ""} · enviado el {fmt.date(version.creadaEl)} · publicación prevista el {fmt.date(pieza.publicacion)}
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
          <div className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
            <ShieldCheckIcon className="size-4 flex-none" />
            Aprobada por {version.aprobada.por} el {fmt.date(version.aprobada.el)} a las {fmt.time(version.aprobada.el)}. {perfil.nombrePila} ya puede {tipo === "guion" ? "grabar" : "programar la publicación"}.
          </div>
        )}
        {version.estado === "cambios" && !version.aprobada && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
            <MessageSquareWarningIcon className="size-4 flex-none" />
            Cambios pedidos: {perfil.nombrePila} tiene tus notas y subirá la v{version.numero + 1}. Este enlace enseñará siempre la última versión.
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_372px]">
          <Block>
            <BlockHeader title={esActual ? `Versión actual · v${viendo.numero}` : `Versión anterior · v${viendo.numero}`}>
              {anteriores.length > 0 && (
                <div className="flex items-center gap-1 sm:ml-2">
                  {[...anteriores, version].map((v) => (
                    <button key={v.id} type="button" onClick={() => setViendo(v.id === version.id ? version : v)} className={cn("rounded-lg border px-2 py-1 text-xs font-medium", viendo.id === v.id ? "border-brand bg-brand-soft" : "border-transparent text-muted-foreground hover:bg-muted")}>
                      v{v.numero}
                    </button>
                  ))}
                </div>
              )}
            </BlockHeader>
            {!esActual && <p className="mb-3 text-xs text-muted-foreground">Solo para comparar: las notas nuevas van en la versión actual.</p>}
            {esActual && !cerrada && <p className="mb-3 text-xs text-muted-foreground">{tipo === "guion" ? "Selecciona un trozo de texto para dejar una nota justo ahí." : "Pulsa en la barra de tiempo para dejar una nota en ese segundo."}</p>}
            {tipo === "guion" ? (
              <GuionViewer texto={viendo.texto ?? ""} notas={esActual ? version.notas : viendo.notas} seleccionada={seleccionada} onSeleccionar={setSeleccionada} onCitar={esActual && !cerrada ? (cita) => setAncla({ tipo: "texto", cita }) : undefined} />
            ) : (
              <VideoViewer version={viendo} notas={esActual ? version.notas : viendo.notas} tint={collab.tint} seleccionada={seleccionada} onSeleccionar={setSeleccionada} onMarcarSegundo={esActual && !cerrada ? (s) => setAncla({ tipo: "segundo", segundo: s }) : undefined} segundoMarcado={ancla?.tipo === "segundo" ? ancla.segundo : null} />
            )}
          </Block>

          <div className="flex flex-col gap-6">
            <Block>
              <BlockHeader title="Notas" count={version.notas.length} />
              <NotesPanel notas={esActual ? version.notas : viendo.notas} modo="marca" seleccionada={seleccionada} onSeleccionar={setSeleccionada} onNueva={esActual && !cerrada ? nuevaNota : undefined} anclaPendiente={ancla} onQuitarAncla={() => setAncla(null)} autor={autor} onAutor={setAutor} />
            </Block>
            <Block>
              <BlockHeader title="Cómo funciona" />
              <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>1. Deja tus notas en el texto o en el segundo del vídeo.</li>
                <li>2. Pulsa «Pedir cambios» y {perfil.nombrePila} sube la siguiente versión; este enlace la enseñará.</li>
                <li>3. Cuando esté bien, «Aprobar»: queda registrado quién aprobó qué y cuándo.</li>
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">Ronda {pieza.rondaActual} de {collab.brief.rondasIncluidas} incluidas en el acuerdo.</p>
            </Block>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Enlace privado para {marca.nombre}, sin cuenta. Caduca el {fmt.date(version.enlace?.caduca ?? hoy)}.</p>
      </main>

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
    </div>
  )
}
