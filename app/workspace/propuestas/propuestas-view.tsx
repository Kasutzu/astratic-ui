"use client"

import * as React from "react"
import { toast } from "sonner"
import { ArrowRightIcon, CalendarClockIcon, KanbanSquareIcon, PlusIcon, SparklesIcon, ThumbsDownIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { statusTextClass } from "@/lib/status"
import {
  ESTADOS_ABIERTOS,
  ESTADOS_PROPUESTA,
  ORIGENES,
  describirPiezas,
  estadoDe,
  type Actividad,
  type EstadoPropuesta,
  type Marca,
  type OrigenPropuesta,
  type Propuesta,
  type Tarea,
  type Tarifa,
} from "@/lib/influencer/modelo"
import { calcularPresupuesto, minimoDe } from "@/lib/influencer/presupuesto"
import { marcaDe } from "@/lib/influencer/collabs"
import { tonoDeFecha } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { usePageView } from "@/hooks/use-page-view"
import { Button } from "@/components/ui/button"
import { PageBody, PageHeader } from "@/components/app/page-header"
import { ActiveFilters, FilterMenu, Toolbar, ToolbarActions, ToolbarSearch, ViewSwitcher } from "@/components/app/toolbar"
import { CellPrimary, DataTable, type Column } from "@/components/app/data-table"
import { RecordList, RecordListItem } from "@/components/app/record-list"
import { Kanban } from "@/components/app/kanban"
import { BulkBar } from "@/components/app/bulk-bar"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { Block } from "@/components/influencer/block"
import { BrandMark } from "@/components/influencer/brand-mark"
import { PropuestaSheet } from "./propuesta-sheet"
import { NuevaPropuestaDialog } from "./nueva-propuesta-dialog"
import { PrepararPropuestaDialog } from "./preparar-propuesta-dialog"

type Tarjeta = Propuesta & { columnId: EstadoPropuesta }

/** Lo que vale la propuesta: lo pedido si ya hay presupuesto; si no, lo que ofrece la marca. */
export function importeDe(p: Propuesta, tarifas: Tarifa[]) {
  if (p.presupuesto) return calcularPresupuesto(p.presupuesto, tarifas).total
  return p.ofrecen ?? 0
}

export function PropuestasView({
  hoy,
  propuestas: iniciales,
  marcas: marcasIniciales,
  tareas: tareasIniciales,
  actividad,
  tarifas,
  abiertaInicial,
  nuevaInicial,
}: {
  hoy: string
  propuestas: Propuesta[]
  marcas: Marca[]
  tareas: Tarea[]
  actividad: Actividad[]
  tarifas: Tarifa[]
  abiertaInicial: string | null
  nuevaInicial: boolean
}) {
  const hoyFecha = soloFecha(hoy)
  const [propuestas, setPropuestas] = React.useState(iniciales)
  const [marcas, setMarcas] = React.useState(marcasIniciales)
  const [tareas, setTareas] = React.useState(tareasIniciales)
  const { view, setView, views } = usePageView("ws-propuestas", ["kanban", "table", "list"])
  const [query, setQuery] = React.useState("")
  const [filtroEstado, setFiltroEstado] = React.useState<string[]>([])
  const [filtroOrigen, setFiltroOrigen] = React.useState<string[]>([])
  const [filtroMarca, setFiltroMarca] = React.useState<string[]>([])
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set())
  const [abiertaId, setAbiertaIdState] = React.useState<string | null>(abiertaInicial)
  const [nueva, setNueva] = React.useState(nuevaInicial)
  const [preparando, setPreparando] = React.useState<Propuesta | null>(null)
  const [borrando, setBorrando] = React.useState<Propuesta | null>(null)

  const setAbiertaId = (id: string | null) => {
    setAbiertaIdState(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set("propuesta", id)
    else url.searchParams.delete("propuesta")
    url.searchParams.delete("nueva")
    window.history.replaceState(null, "", url)
  }

  const marca = (p: Propuesta) => marcaDe(p, marcas)
  const importe = (p: Propuesta) => importeDe(p, tarifas)
  const bajoMinimo = (p: Propuesta) => {
    const minimo = minimoDe(p.piezas, tarifas)
    return (p.ofrecen !== undefined && p.ofrecen > 0 && p.ofrecen < minimo) || (p.presupuesto ? calcularPresupuesto(p.presupuesto, tarifas).bajoMinimo : false)
  }

  const filtradas = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return propuestas.filter(
      (p) =>
        (!q || p.campana.toLowerCase().includes(q) || marca(p).nombre.toLowerCase().includes(q)) &&
        (filtroEstado.length === 0 || filtroEstado.includes(p.estado)) &&
        (filtroOrigen.length === 0 || filtroOrigen.includes(p.origen)) &&
        (filtroMarca.length === 0 || filtroMarca.includes(p.marcaId)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propuestas, marcas, query, filtroEstado, filtroOrigen, filtroMarca])

  const abierta = abiertaId ? (propuestas.find((p) => p.id === abiertaId) ?? null) : null
  const posicion = abiertaId ? filtradas.findIndex((p) => p.id === abiertaId) : -1

  const actualizar = (id: string, cambios: Partial<Propuesta>) => setPropuestas((ps) => ps.map((p) => (p.id === id ? { ...p, ...cambios } : p)))

  const cambiarEstado = (ids: string[], estado: EstadoPropuesta) => {
    setPropuestas((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, estado, ultimoContacto: hoy } : p)))
    setSeleccion(new Set())
    const etiqueta = estadoDe(ESTADOS_PROPUESTA, estado).label
    if (estado === "ganada") toast.success(ids.length === 1 ? "Propuesta ganada: la collab se crea con sus piezas" : `${ids.length} propuestas ganadas`)
    else toast.success(ids.length === 1 ? `Propuesta en «${etiqueta}»` : `${ids.length} propuestas en «${etiqueta}»`)
  }

  const eliminar = (p: Propuesta) => {
    setPropuestas((ps) => ps.filter((x) => x.id !== p.id))
    setAbiertaId(null)
    toast.success(`Propuesta de ${marca(p).nombre} eliminada`)
  }

  const chips = [
    ...filtroEstado.map((v) => ({ label: `Estado: ${estadoDe(ESTADOS_PROPUESTA, v as EstadoPropuesta).label}`, onRemove: () => setFiltroEstado(filtroEstado.filter((x) => x !== v)) })),
    ...filtroOrigen.map((v) => ({ label: `Origen: ${ORIGENES[v as OrigenPropuesta]}`, onRemove: () => setFiltroOrigen(filtroOrigen.filter((x) => x !== v)) })),
    ...filtroMarca.map((v) => ({ label: `Marca: ${marcas.find((m) => m.id === v)?.nombre}`, onRemove: () => setFiltroMarca(filtroMarca.filter((x) => x !== v)) })),
  ]
  const limpiar = () => {
    setFiltroEstado([])
    setFiltroOrigen([])
    setFiltroMarca([])
  }

  const abiertas = filtradas.filter((p) => ESTADOS_ABIERTOS.includes(p.estado))
  const valorAbierto = abiertas.reduce((a, p) => a + importe(p), 0)

  const siguiente = (p: Propuesta) =>
    p.siguientePaso ? (
      <span className={cn("inline-flex min-w-0 items-center gap-1 text-xs font-medium", p.siguienteFecha ? statusTextClass[tonoDeFecha(p.siguienteFecha, hoyFecha) === "vencida" ? "danger" : tonoDeFecha(p.siguienteFecha, hoyFecha) === "hoy" ? "warning" : "neutral"] : "text-muted-foreground")}>
        <CalendarClockIcon className="size-3 flex-none" />
        <span className="truncate">
          {p.siguientePaso}
          {p.siguienteFecha && ` · ${fmt.date(p.siguienteFecha)}`}
        </span>
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">Sin siguiente paso</span>
    )

  const importeCelda = (p: Propuesta) => (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
      {importe(p) > 0 ? fmt.eur(importe(p)) : p.ofrecen === 0 ? "Regalo" : "—"}
      {bajoMinimo(p) && <TriangleAlertIcon className="size-3.5 text-warning" aria-label="Por debajo de tu mínimo" />}
    </span>
  )

  const columnas: Column<Propuesta>[] = [
    { id: "marca", header: "Marca y campaña", minWidth: 240, sortValue: (p) => marca(p).nombre, cell: (p) => <CellPrimary leading={<BrandMark name={marca(p).nombre} tint={marca(p).tint} size="sm" />} title={marca(p).nombre} subtitle={p.campana} /> },
    { id: "piezas", header: "Piden", hideBelow: "lg", cell: (p) => <span className="text-muted-foreground">{describirPiezas(p.piezas)}</span> },
    { id: "estado", header: "Estado", sortValue: (p) => ESTADOS_PROPUESTA.findIndex((e) => e.id === p.estado), cell: (p) => <StatusBadge tone={estadoDe(ESTADOS_PROPUESTA, p.estado).tone}>{estadoDe(ESTADOS_PROPUESTA, p.estado).label}</StatusBadge> },
    { id: "origen", header: "Origen", hideBelow: "xl", cell: (p) => (p.origen === "red" ? <span className="inline-flex items-center gap-1 text-xs font-medium text-brand"><SparklesIcon className="size-3" /> Red Astratic</span> : <span className="text-xs text-muted-foreground">{ORIGENES[p.origen]}</span>) },
    { id: "importe", header: "Importe", align: "right", sortValue: (p) => importe(p), cell: importeCelda },
    { id: "siguiente", header: "Siguiente paso", hideBelow: "2xl", minWidth: 200, sortValue: (p) => p.siguienteFecha ?? "9999", cell: siguiente },
    { id: "contacto", header: "Último contacto", align: "right", hideBelow: "lg", sortValue: (p) => p.ultimoContacto, cell: (p) => <span className="text-xs text-muted-foreground">{fmt.date(p.ultimoContacto)}</span> },
  ]

  const vacio = (
    <EmptyState
      icon={KanbanSquareIcon}
      title={query || chips.length ? "Ninguna propuesta coincide" : "Aún no hay propuestas"}
      description={query || chips.length ? "Prueba con otra búsqueda o quita algún filtro." : "Apunta aquí cada marca que te escribe, y las oportunidades de la red entrarán solas."}
      action={
        query || chips.length ? (
          <Button variant="outline" size="sm" onClick={() => { setQuery(""); limpiar() }}>Quitar filtros</Button>
        ) : (
          <Button size="sm" onClick={() => setNueva(true)}><PlusIcon /> Nueva propuesta</Button>
        )
      }
    />
  )

  const tarjeta = (p: Tarjeta) => {
    const m = marca(p)
    const tono = p.siguienteFecha ? tonoDeFecha(p.siguienteFecha, hoyFecha) : "normal"
    return (
      <div className="flex flex-col">
        <div className="flex items-start gap-2.5">
          <BrandMark name={m.nombre} tint={m.tint} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] leading-[18px] font-semibold">{m.nombre}</div>
            <div className="mt-px truncate text-xs text-muted-foreground">{p.campana}</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <span className="truncate text-muted-foreground">{describirPiezas(p.piezas)}</span>
          <span className="ml-auto">{importeCelda(p)}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2 border-t pt-2">
          {p.origen === "red" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-px text-[11px] font-medium text-brand"><SparklesIcon className="size-3" /> Red Astratic</span>
          ) : (
            <span className="truncate text-[11px] text-muted-foreground">{fmt.relative(p.ultimoContacto, new Date(hoy))}</span>
          )}
          {p.siguienteFecha && (
            <span className={cn("ml-auto inline-flex items-center gap-1 text-[11px] font-medium", tono === "vencida" ? "text-danger" : tono === "hoy" ? "text-warning" : "text-muted-foreground")}>
              <CalendarClockIcon className="size-3" /> {fmt.date(p.siguienteFecha)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <PageBody className="gap-6 px-4 pb-28 md:px-[34px] md:pb-10">
      <PageHeader title="Propuestas" description={`Tu CRM: todo lo que aún no es una collab. ${abiertas.length} abiertas por ${fmt.eur(valorAbierto)}.`} />

      <Block className="min-h-[560px] p-0">
        <div className="flex flex-col gap-2 p-4 pb-3">
          <Toolbar>
            <ToolbarSearch placeholder="Buscar marca o campaña…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterMenu label="Estado" options={ESTADOS_PROPUESTA.map((e) => ({ value: e.id, label: e.label, count: propuestas.filter((p) => p.estado === e.id).length }))} value={filtroEstado} onChange={setFiltroEstado} />
            <FilterMenu label="Origen" options={(Object.keys(ORIGENES) as OrigenPropuesta[]).map((o) => ({ value: o, label: ORIGENES[o] }))} value={filtroOrigen} onChange={setFiltroOrigen} />
            <FilterMenu label="Marca" options={marcas.filter((m) => propuestas.some((p) => p.marcaId === m.id)).map((m) => ({ value: m.id, label: m.nombre }))} value={filtroMarca} onChange={setFiltroMarca} />
            <ToolbarActions>
              <ViewSwitcher views={views} value={view} onChange={setView} />
              <Button onClick={() => setNueva(true)}>
                <PlusIcon /> Nueva propuesta
              </Button>
            </ToolbarActions>
          </Toolbar>
          <ActiveFilters chips={chips} onClear={limpiar} />
        </div>

        <div className={cn("flex min-h-0 flex-1 flex-col", view === "kanban" ? "px-4 pb-4" : "border-t")}>
          {view === "kanban" && (
            <Kanban<Tarjeta>
              columns={ESTADOS_PROPUESTA.map((e) => ({ id: e.id, title: e.label, tone: e.tone, meta: fmt.eur(filtradas.filter((p) => p.estado === e.id).reduce((a, p) => a + importe(p), 0)) }))}
              items={filtradas.map((p) => ({ ...p, columnId: p.estado }))}
              onChange={(next) => {
                const mapa = new Map(next.map((n) => [n.id, n.columnId]))
                setPropuestas((ps) => ps.map((p) => (mapa.has(p.id) && mapa.get(p.id) !== p.estado ? { ...p, estado: mapa.get(p.id) ?? p.estado, ultimoContacto: hoy } : p)))
              }}
              onCardClick={(p) => setAbiertaId(p.id)}
              openId={abiertaId}
              storageKey="ws-propuestas"
              defaultCollapsed={["perdida"]}
              emptyColumn="Nada aquí"
              renderCard={tarjeta}
            />
          )}
          {view === "table" && (
            <DataTable rows={filtradas} columns={columnas} getRowId={(p) => p.id} selectable selected={seleccion} onSelectedChange={setSeleccion} onRowClick={(p) => setAbiertaId(p.id)} activeId={abiertaId} emptyState={vacio} />
          )}
          {view === "list" &&
            (filtradas.length === 0 ? (
              <div className="p-4">{vacio}</div>
            ) : (
              <RecordList>
                {filtradas.map((p) => (
                  <RecordListItem
                    key={p.id}
                    leading={<BrandMark name={marca(p).nombre} tint={marca(p).tint} size="sm" />}
                    title={marca(p).nombre}
                    subtitle={`${p.campana} · ${describirPiezas(p.piezas)}`}
                    status={<StatusBadge tone={estadoDe(ESTADOS_PROPUESTA, p.estado).tone}>{estadoDe(ESTADOS_PROPUESTA, p.estado).label}</StatusBadge>}
                    value={importe(p) > 0 ? fmt.eur(importe(p)) : undefined}
                    selected={seleccion.has(p.id) || p.id === abiertaId}
                    onClick={() => setAbiertaId(p.id)}
                  />
                ))}
              </RecordList>
            ))}
        </div>

        <BulkBar count={seleccion.size} onClear={() => setSeleccion(new Set())}>
          <Button variant="ghost" size="sm" onClick={() => cambiarEstado([...seleccion], "hablando")}><ArrowRightIcon /> A «Hablando»</Button>
          <Button variant="ghost" size="sm" onClick={() => cambiarEstado([...seleccion], "perdida")}><ThumbsDownIcon /> Perdidas</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const ids = [...seleccion]
              const previas = propuestas
              setPropuestas((ps) => ps.filter((p) => !ids.includes(p.id)))
              setSeleccion(new Set())
              toast.success(`${ids.length} propuestas eliminadas`, { action: { label: "Deshacer", onClick: () => setPropuestas(previas) } })
            }}
          >
            <Trash2Icon /> Eliminar
          </Button>
        </BulkBar>
      </Block>

      <PropuestaSheet
        propuesta={abierta}
        marca={abierta ? marca(abierta) : null}
        marcas={marcas}
        tarifas={tarifas}
        hoy={hoy}
        tareas={tareas}
        actividad={actividad}
        posicion={posicion}
        total={filtradas.length}
        onClose={() => setAbiertaId(null)}
        onPrev={() => setAbiertaId(filtradas[posicion - 1].id)}
        onNext={() => setAbiertaId(filtradas[posicion + 1].id)}
        onChange={(cambios) => abierta && actualizar(abierta.id, cambios)}
        onEstado={(estado) => abierta && cambiarEstado([abierta.id], estado)}
        onPreparar={() => setPreparando(abierta)}
        onDelete={() => setBorrando(abierta)}
        onTareas={setTareas}
      />

      <NuevaPropuestaDialog
        open={nueva}
        onOpenChange={setNueva}
        marcas={marcas}
        hoy={hoy}
        onCreate={(p, nuevaMarca) => {
          if (nuevaMarca) setMarcas((ms) => [...ms, nuevaMarca])
          setPropuestas((ps) => [p, ...ps])
          setAbiertaId(p.id)
          toast.success("Propuesta creada")
        }}
      />

      <PrepararPropuestaDialog
        propuesta={preparando}
        marca={preparando ? marca(preparando) : null}
        tarifas={tarifas}
        hoy={hoy}
        onOpenChange={(o) => !o && setPreparando(null)}
        onSave={(presupuesto) => {
          if (!preparando) return
          actualizar(preparando.id, { presupuesto, estado: preparando.estado === "nueva" ? "hablando" : preparando.estado })
          toast.success("Presupuesto y media kit listos")
        }}
      />

      <ConfirmDialog
        open={borrando !== null}
        onOpenChange={(o) => !o && setBorrando(null)}
        title={`¿Eliminar la propuesta de ${borrando ? marca(borrando).nombre : ""}?`}
        description="Se borra con sus tareas y su actividad. Si la marca ha dicho que no, mejor márcala como perdida: así queda el historial."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (borrando) eliminar(borrando)
        }}
      />
    </PageBody>
  )
}
