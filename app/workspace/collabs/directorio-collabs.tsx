"use client"

import * as React from "react"
import { CalendarClockIcon, MailQuestionIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { statusTextClass } from "@/lib/status"
import { COLLABS_ACTIVAS, ESTADOS_COBRO, ESTADOS_COLLAB, TIPOS_COLLAB, estadoDe, type Collab, type FormularioMarca, type Marca } from "@/lib/influencer/modelo"
import { describirEntregables, marcaDe, siguienteHito, unidadesHechas, unidadesTotales } from "@/lib/influencer/collabs"
import { tonoDeFecha } from "@/lib/influencer/tareas"
import { CellPrimary, type Column } from "@/components/app/data-table"
import { RecordList, RecordListItem } from "@/components/app/record-list"
import { StatusBadge } from "@/components/app/status-badge"
import { BrandMark } from "@/components/influencer/brand-mark"
import { CollabCard } from "@/components/influencer/collab-card"

/** Brief pedido a la marca y aún sin respuesta: la collab espera a que lo rellene. */
export const esperaBrief = (c: Collab, formularios: FormularioMarca[]) => c.piezas.length === 0 && formularios.some((f) => f.collabId === c.id && f.alcance === "brief" && !f.respondidoEl)

function Hito({ c, hoy, formularios }: { c: Collab; hoy: string; formularios: FormularioMarca[] }) {
  if (esperaBrief(c, formularios))
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-info">
        <MailQuestionIcon className="size-3 flex-none" /> Esperando el brief de la marca
      </span>
    )
  const h = siguienteHito(c)
  if (!h) return <span className="text-xs text-muted-foreground">Todo entregado</span>
  const tono = tonoDeFecha(h.fecha, hoy)
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 text-xs font-medium", statusTextClass[tono === "vencida" ? "danger" : tono === "hoy" ? "warning" : "neutral"])}>
      <CalendarClockIcon className="size-3 flex-none" />
      <span className="truncate">
        {h.label} · {fmt.date(h.fecha)}
      </span>
    </span>
  )
}

/** Las columnas de la tabla de collabs. */
export function columnasCollabs({ marcas, hoy, formularios }: { marcas: Marca[]; hoy: string; formularios: FormularioMarca[] }): Column<Collab>[] {
  const marca = (c: Collab) => marcaDe(c, marcas)
  return [
    { id: "marca", header: "Marca y campaña", minWidth: 240, sortValue: (c) => marca(c).nombre, cell: (c) => <CellPrimary leading={<BrandMark name={marca(c).nombre} tint={c.tint} size="sm" />} title={marca(c).nombre} subtitle={c.campana} /> },
    { id: "estado", header: "Estado", sortValue: (c) => ESTADOS_COLLAB.findIndex((e) => e.id === c.estado), cell: (c) => <StatusBadge tone={estadoDe(ESTADOS_COLLAB, c.estado).tone}>{estadoDe(ESTADOS_COLLAB, c.estado).label}</StatusBadge> },
    { id: "hito", header: "Siguiente hito", minWidth: 240, sortValue: (c) => siguienteHito(c)?.fecha ?? "9999", cell: (c) => <Hito c={c} hoy={hoy} formularios={formularios} /> },
    { id: "piezas", header: "Piezas", hideBelow: "lg", sortValue: (c) => unidadesHechas(c) / Math.max(1, unidadesTotales(c)), cell: (c) => <span className="tabular-nums">{unidadesHechas(c)} de {unidadesTotales(c)} <span className="text-muted-foreground">· {describirEntregables(c)}</span></span> },
    { id: "tipo", header: "Tipo", hideBelow: "xl", sortValue: (c) => c.tipo, cell: (c) => <span className="text-muted-foreground">{TIPOS_COLLAB[c.tipo].label}</span> },
    { id: "ventana", header: "Publicación", hideBelow: "2xl", sortValue: (c) => c.desde, cell: (c) => <span className="text-xs text-muted-foreground">{fmt.date(c.desde)} – {fmt.date(c.hasta)}</span> },
    { id: "importe", header: "Importe", align: "right", sortValue: (c) => c.importe, cell: (c) => <span className="font-semibold tabular-nums">{fmt.eur(c.importeNeto ?? c.importe)}{c.importeNeto && <span className="text-xs font-normal text-muted-foreground"> de {fmt.eur(c.importe)}</span>}</span> },
    { id: "cobro", header: "Cobro", hideBelow: "lg", sortValue: (c) => ESTADOS_COBRO.findIndex((e) => e.id === c.cobro.estado), cell: (c) => <StatusBadge tone={estadoDe(ESTADOS_COBRO, c.cobro.estado).tone} dot>{estadoDe(ESTADOS_COBRO, c.cobro.estado).label}</StatusBadge> },
  ]
}

/** El directorio en tarjetas: la imagen de cada campaña, sus piezas y lo siguiente. */
export function TarjetasCollabs({ collabs, marcas, formularios }: { collabs: Collab[]; marcas: Marca[]; formularios: FormularioMarca[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 p-4">
      {collabs.map((c) => {
        const h = siguienteHito(c)
        const cerrada = !COLLABS_ACTIVAS.includes(c.estado)
        const brief = esperaBrief(c, formularios)
        return (
          <CollabCard
            key={c.id}
            brand={marcaDe(c, marcas).nombre}
            campaign={c.campana}
            deliverables={c.piezas.length ? describirEntregables(c) : undefined}
            done={unidadesHechas(c)}
            total={unidadesTotales(c)}
            nextLabel={brief ? "Esperando el brief de la marca" : h ? h.label : cerrada ? estadoDe(ESTADOS_COLLAB, c.estado).label : "Todo entregado"}
            nextDate={h?.fecha ?? c.hasta}
            tint={c.tint}
            coverUrl={c.coverUrl}
            href={`/workspace/collabs/${c.id}`}
            className={cn("w-auto", cerrada && "opacity-80 saturate-50 hover:opacity-100 hover:saturate-100")}
          />
        )
      })}
    </div>
  )
}

/** El directorio en lista (la vista del móvil): marca, campaña, lo siguiente, estado e importe. */
export function ListaCollabs({ collabs, marcas, formularios, hoy, seleccion, onAbrir }: { collabs: Collab[]; marcas: Marca[]; formularios: FormularioMarca[]; hoy: string; seleccion: Set<string>; onAbrir: (c: Collab) => void }) {
  return (
    <RecordList>
      {collabs.map((c) => {
        const e = estadoDe(ESTADOS_COLLAB, c.estado)
        return (
          <RecordListItem
            key={c.id}
            leading={<BrandMark name={marcaDe(c, marcas).nombre} tint={c.tint} size="sm" />}
            title={`${marcaDe(c, marcas).nombre} · ${c.campana}`}
            subtitle={<Hito c={c} hoy={hoy} formularios={formularios} />}
            status={<StatusBadge tone={e.tone}>{e.label}</StatusBadge>}
            value={fmt.eur(c.importeNeto ?? c.importe)}
            selected={seleccion.has(c.id)}
            onClick={() => onAbrir(c)}
          />
        )
      })}
    </RecordList>
  )
}
