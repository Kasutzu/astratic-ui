"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarCheckIcon, CalendarClockIcon, CheckIcon, HourglassIcon, PlusIcon } from "lucide-react"
import { cn } from "cn"
import { COLLABS_ACTIVAS, type Collab, type Marca, type Propuesta, type Tarea } from "@/lib/influencer/modelo"
import { contextoDeTarea, hrefDeTarea, tonoDeFecha } from "@/lib/influencer/tareas"
import { enRevision, fechaCercana, proximasTareas, tareasDeHoy } from "@/lib/influencer/cifras-collabs"
import { marcaDe } from "@/lib/influencer/collabs"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { InsightsPanel } from "@/components/app/insights-panel"
import { BrandMark } from "@/components/influencer/brand-mark"
import { TaskDialog } from "@/components/influencer/task-dialog"

const MAX_PROXIMAS = 8

/** Una tarea en el panel: círculo para hacerla, título, de qué collab es y cuándo vence. */
function TareaFila({ tarea, hoy, contexto, marca, href, onToggle }: { tarea: Tarea; hoy: string; contexto?: string; marca?: Marca; href?: string; onToggle: () => void }) {
  const tono = tonoDeFecha(tarea.fechaLimite, hoy)
  return (
    <li className="group flex items-start gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted">
      <button
        type="button"
        role="checkbox"
        aria-checked={tarea.hecha}
        aria-label={`Marcar «${tarea.titulo}» como hecha`}
        onClick={onToggle}
        className={cn("mt-0.5 grid size-4 flex-none place-items-center rounded-full border-[1.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50", tarea.hecha ? "border-brand bg-brand text-brand-foreground" : "border-control hover:border-brand")}
      >
        {tarea.hecha && <CheckIcon className="size-2.5" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] leading-snug", tarea.hecha && "text-muted-foreground line-through")}>{tarea.titulo}</p>
        {contexto && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            {marca && <BrandMark name={marca.nombre} tint={marca.tint} size="xs" className="size-4 rounded text-[7px]" />}
            {href ? (
              <Link href={href} className="truncate hover:text-foreground hover:underline">
                {contexto}
              </Link>
            ) : (
              <span className="truncate">{contexto}</span>
            )}
          </p>
        )}
      </div>
      {tarea.fechaLimite && <span className={cn("flex-none pt-0.5 text-[11px] font-medium tabular-nums", tono === "vencida" ? "text-danger" : tono === "hoy" ? "text-warning" : "text-muted-foreground")}>{fechaCercana(tarea.fechaLimite, hoy)}</span>}
    </li>
  )
}

/**
 * El panel de la derecha de Collabs: las tareas de hoy (con las vencidas), las de los próximos días y
 * lo que espera a la marca. No es la página de tareas: es lo que hay que ver de un vistazo, con su
 * collab y su fecha, y se marca desde aquí.
 */
export function PanelCollabs({ hoy, tareas, setTareas, collabs, propuestas, marcas }: { hoy: string; tareas: Tarea[]; setTareas: React.Dispatch<React.SetStateAction<Tarea[]>>; collabs: Collab[]; propuestas: Propuesta[]; marcas: Marca[] }) {
  const [nueva, setNueva] = React.useState(false)
  const dia = soloFecha(hoy)
  const contexto = { collabs, propuestas, marcas }
  const deHoy = tareasDeHoy(tareas, dia)
  const proximas = proximasTareas(tareas, dia)
  const esperando = enRevision(collabs.filter((c) => COLLABS_ACTIVAS.includes(c.estado)), marcas, dia)
  const relaciones = collabs.filter((c) => COLLABS_ACTIVAS.includes(c.estado)).map((c) => ({ tipo: "collab" as const, id: c.id, label: `${marcaDe(c, marcas).nombre} · ${c.campana}` }))

  const marcaDeTarea = (t: Tarea) => {
    if (!t.relacion) return undefined
    if (t.relacion.tipo === "marca") return marcas.find((m) => m.id === t.relacion?.id)
    const registro = t.relacion.tipo === "collab" ? collabs.find((c) => c.id === t.relacion?.id) : propuestas.find((p) => p.id === t.relacion?.id)
    return registro ? marcas.find((m) => m.id === registro.marcaId) : undefined
  }

  const alternar = (t: Tarea) => {
    setTareas((ts) => ts.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha, hechaEl: x.hecha ? undefined : hoy } : x)))
    if (!t.hecha) toast.success("Tarea hecha", { action: { label: "Deshacer", onClick: () => setTareas((ts) => ts.map((x) => (x.id === t.id ? { ...x, hecha: false, hechaEl: undefined } : x))) } })
  }

  const fila = (t: Tarea) => <TareaFila key={t.id} tarea={t} hoy={dia} contexto={contextoDeTarea(t, contexto)} marca={marcaDeTarea(t)} href={hrefDeTarea(t)} onToggle={() => alternar(t)} />

  return (
    <>
      <InsightsPanel
        storageKey="ws-collabs"
        title="Tareas"
        blocks={[
          {
            id: "hoy",
            title: `Hoy · ${deHoy.length}`,
            icon: CalendarCheckIcon,
            action: (
              <Button variant="ghost" size="sm" className="-my-1 h-6 px-1.5 text-xs" onClick={() => setNueva(true)}>
                <PlusIcon /> Tarea
              </Button>
            ),
            render: () => (deHoy.length ? <ul className="-mx-1.5 flex flex-col">{deHoy.map(fila)}</ul> : <p className="text-xs text-muted-foreground">Nada para hoy: lo urgente está hecho.</p>),
          },
          {
            id: "proximas",
            title: `Próximos 7 días · ${proximas.length}`,
            icon: CalendarClockIcon,
            action: (
              <Link href="/workspace/tareas" className="font-medium text-brand hover:underline">
                Ver todas
              </Link>
            ),
            render: () => (proximas.length ? <ul className="-mx-1.5 flex flex-col">{proximas.slice(0, MAX_PROXIMAS).map(fila)}</ul> : <p className="text-xs text-muted-foreground">Nada con fecha en la próxima semana.</p>),
          },
          {
            id: "esperando",
            title: "Esperando a la marca",
            icon: HourglassIcon,
            render: () =>
              esperando.length ? (
                <ul className="-mx-1.5 flex flex-col">
                  {esperando.map((e) => (
                    <li key={`${e.piezaId}-${e.parte}`}>
                      <Link href={`/workspace/collabs/${e.collabId}/contenidos/${e.piezaId}?parte=${e.parte}`} className="flex items-start gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px]">{e.titulo}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {e.marca} · {e.nombreParte} v{e.version}
                          </span>
                        </span>
                        <span className={cn("flex-none pt-0.5 text-[11px] font-medium tabular-nums", e.dias >= 2 ? "text-warning" : "text-muted-foreground")}>{e.dias === 0 ? "Hoy" : `${e.dias} ${e.dias === 1 ? "día" : "días"}`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nada pendiente de la marca.</p>
              ),
          },
        ]}
      />
      <TaskDialog
        open={nueva}
        onOpenChange={setNueva}
        hoy={dia}
        relaciones={relaciones}
        onCreate={(t) => {
          setTareas((ts) => [...ts, t])
          toast.success("Tarea creada")
        }}
      />
    </>
  )
}
