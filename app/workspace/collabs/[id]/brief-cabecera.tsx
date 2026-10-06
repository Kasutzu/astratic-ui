"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { BanIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, EllipsisIcon, FilePenLineIcon, MailQuestionIcon, PlusIcon, SendIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_COLLAB, ESTADOS_PIEZA, ESTADOS_PRODUCTO, TIPOS_COLLAB, estadoDe, type EstadoCollab, type Pieza } from "@/lib/influencer/modelo"
import { describirEntregables } from "@/lib/influencer/collabs"
import { primerParrafo, textoPlano } from "@/lib/influencer/guion"
import { soloFecha } from "@/lib/influencer/fechas"
import { tintClass } from "@/lib/influencer/tints"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageTabs } from "@/components/app/page-tabs"
import { StatusBadge } from "@/components/app/status-badge"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useBreadcrumb } from "@/components/app/app-shell"
import { BrandMark } from "@/components/influencer/brand-mark"
import { TaskDialog } from "@/components/influencer/task-dialog"
import { ICONOS_PIEZA } from "@/components/influencer/piezas-editor"
import { useOrigen } from "@/components/influencer/navegador"
import { collabTabs } from "@/app/workspace/nav"
import { useCollab } from "./collab-provider"
import { BriefCompleto } from "./brief-completo"
import { PedirFormularioDialog } from "./pedir-formulario-dialog"

const PUNTO_PIEZA: Record<string, string> = { success: "bg-success", info: "bg-info", warning: "bg-warning", danger: "bg-danger", neutral: "bg-muted-foreground/60" }

function Dato({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{children}</dd>
    </div>
  )
}

/** Las piezas en miniatura: cada una lleva a su contenido. */
function Miniaturas({ piezas, base }: { piezas: Pieza[]; base: string }) {
  const { collab } = useCollab()
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {piezas.map((p) => {
        const e = estadoDe(ESTADOS_PIEZA, p.estado)
        const Icono = ICONOS_PIEZA[p.tipo]
        return (
          <Tooltip key={p.id}>
            <TooltipTrigger asChild>
              <Link href={`${base}/contenidos/${p.id}`} className={cn("relative h-16 w-12 flex-none overflow-hidden rounded-lg ring-offset-2 ring-offset-card transition-transform hover:-translate-y-0.5 hover:ring-2 hover:ring-brand", tintClass[collab.tint])}>
                {p.portadaUrl ? <Image src={p.portadaUrl} alt={p.titulo} fill sizes="48px" className="object-cover" /> : <Icono className="absolute inset-0 m-auto size-4" aria-label={p.titulo} />}
                <span className={cn("absolute right-1 bottom-1 size-2 rounded-full ring-2 ring-card", PUNTO_PIEZA[e.tone])} />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              {p.titulo} · {e.label.toLowerCase()} · {fmt.date(p.publicacion)}
            </TooltipContent>
          </Tooltip>
        )
      })}
      <Button variant="outline" size="icon" asChild className="h-16 w-12 flex-none rounded-lg border-dashed">
        <Link href={`${base}/contenidos?nueva=1`} aria-label="Nueva pieza">
          <PlusIcon />
        </Link>
      </Button>
    </div>
  )
}

/**
 * Lo de arriba de la collab, en todas sus pestañas: la imagen de la campaña con su nombre, el brief
 * compacto (datos clave, el principio del texto y las piezas en miniatura) que se expande al brief
 * entero, y debajo la navegación entre sus partes.
 */
export function BriefCabecera() {
  const { collab, setCollab, marca, hoy, formularios, tareas } = useCollab()
  useBreadcrumb([{ label: `${marca.nombre} · ${collab.campana}` }])
  const origen = useOrigen()
  const [abierto, setAbierto] = React.useState(false)
  const [pedir, setPedir] = React.useState(false)
  const [nuevaTarea, setNuevaTarea] = React.useState(false)
  const [cancelando, setCancelando] = React.useState(false)
  const base = `/workspace/collabs/${collab.id}`
  const { brief } = collab
  const estado = estadoDe(ESTADOS_COLLAB, collab.estado)
  const resumen = primerParrafo(brief.texto) || textoPlano(brief.texto).replace(/\s+/g, " ").trim()
  const pendiente = formularios[0].find((f) => f.alcance === "brief" && !f.respondidoEl)
  const meTocan = collab.piezas.filter((p) => p.estado === "borrador" || p.estado === "cambios").length

  const cambiarEstado = (id: EstadoCollab) => {
    const previo = collab.estado
    setCollab((c) => ({ ...c, estado: id }))
    toast.success(`Collab: ${estadoDe(ESTADOS_COLLAB, id).label.toLowerCase()}`, { action: { label: "Deshacer", onClick: () => setCollab((c) => ({ ...c, estado: previo })) } })
  }

  return (
    <>
      <section data-slot="ws-brief-cabecera" className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className={cn("relative h-36 md:h-44", !collab.coverUrl && tintClass[collab.tint])}>
          {collab.coverUrl && (
            <>
              <Image src={collab.coverUrl} alt="" fill preload sizes="(min-width: 1280px) 1100px, 100vw" className="object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" aria-hidden />
            </>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="bg-card/90 backdrop-blur" onClick={() => setNuevaTarea(true)}>
              <PlusIcon /> Tarea
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="outline" className="bg-card/90 backdrop-blur" aria-label="Más acciones">
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setPedir(true)}>
                  <SendIcon /> Pedir el brief a la marca
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={async () => {
                    await navigator.clipboard.writeText(`${origen}${base}`)
                    toast.success("Enlace copiado")
                  }}
                >
                  <CopyIcon /> Copiar enlace de la collab
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={collab.estado === "cancelada"} onSelect={() => setCancelando(true)}>
                  <BanIcon /> Cancelar collab
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className={cn("absolute right-5 bottom-4 left-5 flex items-end gap-3.5", collab.coverUrl && "text-white")}>
            <BrandMark name={marca.nombre} tint={collab.tint} size="lg" className="ring-2 ring-card" />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm", collab.coverUrl ? "text-white/80" : "opacity-80")}>
                {marca.nombre} · {TIPOS_COLLAB[collab.tipo].label}
              </p>
              <h1 className="line-clamp-2 text-[22px] leading-tight font-semibold tracking-tight md:truncate md:text-[27px]">{collab.campana}</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex-none rounded-full bg-card px-0.5 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label="Cambiar el estado">
                  <StatusBadge tone={estado.tone}>
                    {estado.label} <ChevronDownIcon className="size-3" />
                  </StatusBadge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {ESTADOS_COLLAB.map((e) => (
                  <DropdownMenuItem key={e.id} onSelect={() => cambiarEstado(e.id)}>
                    {e.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {abierto ? (
            <BriefCompleto />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
                  <Dato label="Importe">
                    <span className="tabular-nums">{fmt.eur(collab.importeNeto ?? collab.importe)}</span>
                    {collab.importeNeto && <span className="font-normal text-muted-foreground"> de {fmt.eur(collab.importe)}</span>}
                  </Dato>
                  <Dato label="Publicación">
                    {fmt.date(collab.desde)} – {fmt.date(collab.hasta)}
                  </Dato>
                  <Dato label="Entregables">{describirEntregables(collab)}</Dato>
                  <Dato label="Rondas">{brief.rondasIncluidas} por pieza</Dato>
                  <Dato label="Derechos">{brief.derechosUso ?? "Solo orgánico"}</Dato>
                  <Dato label="Producto">{brief.producto ? estadoDe(ESTADOS_PRODUCTO, brief.producto.estado).label : "Sin envío"}</Dato>
                </dl>
                {resumen ? (
                  <p className="mt-4 line-clamp-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">{resumen}</p>
                ) : pendiente ? (
                  <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-info-soft px-3 py-2 text-sm text-info">
                    <MailQuestionIcon className="size-4 flex-none" />
                    Esperando el brief de {pendiente.para.nombre}: se lo mandaste el {fmt.date(pendiente.creadoEl)}.
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-info hover:text-info"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${origen}/formulario/${pendiente.token}`)
                        toast.success("Enlace copiado")
                      }}
                    >
                      <CopyIcon /> Copiar enlace
                    </Button>
                  </p>
                ) : (
                  <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    Aún no hay brief.
                    <Button variant="outline" size="sm" className="h-7" onClick={() => setAbierto(true)}>
                      <FilePenLineIcon /> Escribirlo
                    </Button>
                    <Button variant="outline" size="sm" className="h-7" onClick={() => setPedir(true)}>
                      <SendIcon /> Pedírselo a la marca
                    </Button>
                  </p>
                )}
              </div>
              <Miniaturas piezas={collab.piezas} base={base} />
            </div>
          )}
          <Button variant="ghost" size="sm" className="-mb-1 self-center text-muted-foreground" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
            {abierto ? (
              <>
                <ChevronUpIcon /> Contraer el brief
              </>
            ) : (
              <>
                <ChevronDownIcon /> Ver el brief completo
              </>
            )}
          </Button>
        </div>
      </section>

      <PageTabs items={collabTabs(collab.id, { piezas: meTocan })} />

      <PedirFormularioDialog open={pedir} onOpenChange={setPedir} alcance="brief" />
      <TaskDialog
        open={nuevaTarea}
        onOpenChange={setNuevaTarea}
        hoy={soloFecha(hoy)}
        relacionFija={{ tipo: "collab", id: collab.id, label: `${marca.nombre} · ${collab.campana}` }}
        onCreate={(t) => {
          tareas[1]((ts) => [...ts, t])
          toast.success("Tarea creada: la verás en el cronograma y en tu lista general")
        }}
      />
      <ConfirmDialog
        open={cancelando}
        onOpenChange={setCancelando}
        title="¿Cancelar esta collab?"
        description="Se queda en el historial como cancelada, con sus contenidos y materiales."
        confirmLabel="Cancelar la collab"
        destructive
        onConfirm={() => cambiarEstado("cancelada")}
      />
    </>
  )
}
