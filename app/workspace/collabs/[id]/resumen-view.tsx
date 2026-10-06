"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRightIcon, CalendarRangeIcon, ClapperboardIcon, PlusIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_PIEZA, estadoDe } from "@/lib/influencer/modelo"
import { etiquetaDePieza, piezasPorFecha } from "@/lib/influencer/collabs"
import { fasesDePieza, moverPieza } from "@/lib/influencer/cronograma"
import { eventosDeCollabs, eventosDeTareas } from "@/lib/influencer/agenda"
import { soloFecha, sumarDias } from "@/lib/influencer/fechas"
import { tintClass } from "@/lib/influencer/tints"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Section, SectionBody, SectionHeader } from "@/components/app/section"
import { EmptyState } from "@/components/app/states"
import { PiezaCard } from "@/components/influencer/pieza-card"
import { Gantt, type FilaGantt } from "@/components/influencer/gantt"
import { Agenda } from "@/components/influencer/agenda"
import { TaskTable } from "@/components/influencer/task-table"
import { ICONOS_PIEZA } from "@/components/influencer/piezas-editor"
import { useCollab } from "./collab-provider"

export type VistaCronograma = "gantt" | "calendario" | "tareas"

const VISTAS: { id: VistaCronograma; label: string }[] = [
  { id: "gantt", label: "Gantt" },
  { id: "calendario", label: "Calendario" },
  { id: "tareas", label: "Tareas" },
]

/**
 * La portada de la collab, debajo del brief: los entregables con su estado y lo que toca, y el
 * cronograma en Gantt (por defecto), en calendario o como lista de tareas.
 */
export function ResumenView({ vistaInicial }: { vistaInicial: VistaCronograma }) {
  const router = useRouter()
  const { collab, setPieza, marca, hoy, tareas: [tareas, setTareas] } = useCollab()
  const [vista, setVista] = React.useState(vistaInicial)
  const hoyFecha = soloFecha(hoy)
  const base = `/workspace/collabs/${collab.id}`
  const piezas = piezasPorFecha(collab.piezas)
  const pendientes = tareas.filter((t) => !t.hecha).length

  const cambiarVista = (v: VistaCronograma) => {
    setVista(v)
    // La vista va en la URL para poder enlazarla («Ver tareas» desde otras páginas) sin recargar.
    const url = new URL(window.location.href)
    if (v === "gantt") url.searchParams.delete("vista")
    else url.searchParams.set("vista", v)
    window.history.replaceState(null, "", url)
  }

  const mover = (id: string, dias: number) => {
    const pieza = collab.piezas.find((p) => p.id === id)
    if (!pieza) return
    setPieza(id, (p) => moverPieza(p, dias))
    toast.success(`${pieza.titulo}: publicar el ${fmt.date(sumarDias(pieza.publicacion, dias))}`, { action: { label: "Deshacer", onClick: () => setPieza(id, (p) => moverPieza(p, -dias)) } })
  }

  const filas: FilaGantt[] = piezas.map((p) => {
    const Icono = ICONOS_PIEZA[p.tipo]
    return {
      id: p.id,
      titulo: p.titulo,
      subtitulo: `${etiquetaDePieza(p)} · ${estadoDe(ESTADOS_PIEZA, p.estado).label.toLowerCase()}`,
      inicio: (
        <span className={cn("relative h-10 w-8 flex-none overflow-hidden rounded-md", tintClass[collab.tint])}>
          {p.portadaUrl ? <Image src={p.portadaUrl} alt="" fill sizes="32px" className="object-cover" /> : <Icono className="absolute inset-0 m-auto size-4" />}
        </span>
      ),
      fases: fasesDePieza(p),
      publicacion: p.publicacion,
      publicada: !!p.publicada,
    }
  })

  return (
    <div className="flex flex-col gap-5">
      <Section className="flex-none">
        <SectionHeader
          icon={ClapperboardIcon}
          title="Entregables"
          count={collab.piezas.length}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${base}/contenidos`}>
                Ver contenidos <ArrowRightIcon />
              </Link>
            </Button>
          }
        />
        <SectionBody className="p-3">
          {piezas.length === 0 ? (
            <EmptyState
              icon={ClapperboardIcon}
              title="Sin piezas todavía"
              description="Añade las piezas del brief o espera a que la marca las mande en su formulario."
              action={
                <Button size="sm" asChild>
                  <Link href={`${base}/contenidos?nueva=1`}>
                    <PlusIcon /> Añadir pieza
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-2 2xl:grid-cols-2">
              {piezas.map((p) => (
                <PiezaCard key={p.id} pieza={p} tint={collab.tint} hoy={hoyFecha} href={`${base}/contenidos/${p.id}`} />
              ))}
            </div>
          )}
        </SectionBody>
      </Section>

      <Section className="flex-none">
        <SectionHeader icon={CalendarRangeIcon} title="Cronograma" meta={vista === "tareas" ? `${pendientes} pendientes` : vista === "gantt" ? "Arrastra una pieza para mover sus fechas" : undefined}>
          <Tabs value={vista} onValueChange={(v) => cambiarVista(VISTAS.find((x) => x.id === v)?.id ?? "gantt")} className="ml-2">
            <TabsList className="h-7">
              {VISTAS.map((v) => (
                <TabsTrigger key={v.id} value={v.id} className="text-xs">
                  {v.label}
                  {v.id === "tareas" && pendientes > 0 && <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{pendientes}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SectionHeader>
        <SectionBody className="p-4">
          {vista === "gantt" &&
            (filas.length ? <Gantt filas={filas} hoy={hoy} onMover={mover} onAbrir={(id) => router.push(`${base}/contenidos/${id}`)} /> : <EmptyState title="Nada que planificar" description="El cronograma sale de la fecha de publicación de cada pieza." />)}
          {vista === "calendario" && <Agenda eventos={[...eventosDeCollabs([collab], [marca]), ...eventosDeTareas(tareas, [collab])]} hoy={hoy} />}
          {vista === "tareas" && (
            <TaskTable
              tareas={tareas}
              hoy={hoyFecha}
              relacionFija={{ tipo: "collab", id: collab.id, label: `${marca.nombre} · ${collab.campana}` }}
              onToggle={(id) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)))}
              onUpdate={(t) => setTareas((ts) => ts.map((x) => (x.id === t.id ? t : x)))}
              onCreate={(t) => setTareas((ts) => [...ts, t])}
              onDelete={(ids) => setTareas((ts) => ts.filter((t) => !ids.includes(t.id)))}
            />
          )}
        </SectionBody>
      </Section>
    </div>
  )
}
