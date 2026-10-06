"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarClockIcon, PlusIcon, SparklesIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { statusTextClass } from "@/lib/status"
import { COLLABS_ACTIVAS, ESTADOS_COBRO, ESTADOS_COLLAB, TIPOS_COLLAB, estadoDe, type Collab, type EstadoCollab, type Marca, type Tarea, type TipoCollab } from "@/lib/influencer/modelo"
import { describirEntregables, marcaDe, siguienteHito, unidadesHechas, unidadesTotales } from "@/lib/influencer/collabs"
import { eventosDeCollabs, eventosDeTareas } from "@/lib/influencer/agenda"
import { tonoDeFecha } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { usePageView } from "@/hooks/use-page-view"
import { Button } from "@/components/ui/button"
import { PageBody, PageHeader } from "@/components/app/page-header"
import { ActiveFilters, FilterMenu, Toolbar, ToolbarActions, ToolbarSearch, ViewSwitcher } from "@/components/app/toolbar"
import { CellPrimary, DataTable, type Column } from "@/components/app/data-table"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { Block } from "@/components/influencer/block"
import { BrandMark } from "@/components/influencer/brand-mark"
import { CollabCard } from "@/components/influencer/collab-card"
import { Agenda } from "@/components/influencer/agenda"
import { NuevaCollabDialog } from "./nueva-collab-dialog"

export function CollabsView({ hoy, collabs: iniciales, marcas, tareas, nuevaInicial }: { hoy: string; collabs: Collab[]; marcas: Marca[]; tareas: Tarea[]; nuevaInicial: boolean }) {
  const router = useRouter()
  const hoyFecha = soloFecha(hoy)
  const [collabs, setCollabs] = React.useState(iniciales)
  const { view, setView, views } = usePageView("ws-collabs", ["grid", "table", "calendar"])
  const [query, setQuery] = React.useState("")
  const [filtroEstado, setFiltroEstado] = React.useState<string[]>([])
  const [filtroTipo, setFiltroTipo] = React.useState<string[]>([])
  const [filtroMarca, setFiltroMarca] = React.useState<string[]>([])
  const [nueva, setNueva] = React.useState(nuevaInicial)

  const marca = (c: Collab) => marcaDe(c, marcas)

  const filtradas = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const orden = (c: Collab) => (COLLABS_ACTIVAS.includes(c.estado) ? 0 : 1)
    return collabs
      .filter(
        (c) =>
          (!q || c.campana.toLowerCase().includes(q) || marca(c).nombre.toLowerCase().includes(q)) &&
          (filtroEstado.length === 0 || filtroEstado.includes(c.estado)) &&
          (filtroTipo.length === 0 || filtroTipo.includes(c.tipo)) &&
          (filtroMarca.length === 0 || filtroMarca.includes(c.marcaId)),
      )
      .sort((a, b) => orden(a) - orden(b) || b.desde.localeCompare(a.desde))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabs, query, filtroEstado, filtroTipo, filtroMarca])

  const chips = [
    ...filtroEstado.map((v) => ({ label: `Estado: ${estadoDe(ESTADOS_COLLAB, v as EstadoCollab).label}`, onRemove: () => setFiltroEstado(filtroEstado.filter((x) => x !== v)) })),
    ...filtroTipo.map((v) => ({ label: `Tipo: ${TIPOS_COLLAB[v as TipoCollab].label}`, onRemove: () => setFiltroTipo(filtroTipo.filter((x) => x !== v)) })),
    ...filtroMarca.map((v) => ({ label: `Marca: ${marcas.find((m) => m.id === v)?.nombre}`, onRemove: () => setFiltroMarca(filtroMarca.filter((x) => x !== v)) })),
  ]
  const limpiar = () => {
    setFiltroEstado([])
    setFiltroTipo([])
    setFiltroMarca([])
  }

  const activas = collabs.filter((c) => COLLABS_ACTIVAS.includes(c.estado))
  const abrir = (c: Collab) => router.push(`/workspace/collabs/${c.id}`)

  const hitoCelda = (c: Collab) => {
    const h = siguienteHito(c)
    if (!h) return <span className="text-xs text-muted-foreground">Todo entregado</span>
    const tono = tonoDeFecha(h.fecha, hoyFecha)
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-1 text-xs font-medium", statusTextClass[tono === "vencida" ? "danger" : tono === "hoy" ? "warning" : "neutral"])}>
        <CalendarClockIcon className="size-3 flex-none" />
        <span className="truncate">
          {h.label} · {fmt.date(h.fecha)}
        </span>
      </span>
    )
  }

  const columnas: Column<Collab>[] = [
    { id: "marca", header: "Marca y campaña", minWidth: 240, sortValue: (c) => marca(c).nombre, cell: (c) => <CellPrimary leading={<BrandMark name={marca(c).nombre} tint={c.tint} size="sm" />} title={marca(c).nombre} subtitle={c.campana} /> },
    { id: "tipo", header: "Tipo", hideBelow: "xl", cell: (c) => <span className="text-muted-foreground">{TIPOS_COLLAB[c.tipo].label}</span> },
    { id: "piezas", header: "Piezas", hideBelow: "lg", sortValue: (c) => unidadesHechas(c) / Math.max(1, unidadesTotales(c)), cell: (c) => <span className="tabular-nums">{unidadesHechas(c)} de {unidadesTotales(c)} <span className="text-muted-foreground">· {describirEntregables(c)}</span></span> },
    { id: "estado", header: "Estado", sortValue: (c) => ESTADOS_COLLAB.findIndex((e) => e.id === c.estado), cell: (c) => <StatusBadge tone={estadoDe(ESTADOS_COLLAB, c.estado).tone}>{estadoDe(ESTADOS_COLLAB, c.estado).label}</StatusBadge> },
    { id: "hito", header: "Siguiente hito", hideBelow: "2xl", minWidth: 220, sortValue: (c) => siguienteHito(c)?.fecha ?? "9999", cell: hitoCelda },
    { id: "importe", header: "Importe", align: "right", sortValue: (c) => c.importe, cell: (c) => <span className="font-semibold tabular-nums">{fmt.eur(c.importeNeto ?? c.importe)}{c.importeNeto && <span className="text-xs font-normal text-muted-foreground"> de {fmt.eur(c.importe)}</span>}</span> },
    { id: "cobro", header: "Cobro", hideBelow: "lg", cell: (c) => <StatusBadge tone={estadoDe(ESTADOS_COBRO, c.cobro.estado).tone} dot>{estadoDe(ESTADOS_COBRO, c.cobro.estado).label}</StatusBadge> },
  ]

  const vacio = (
    <EmptyState
      icon={SparklesIcon}
      title={query || chips.length ? "Ninguna collab coincide" : "Aún no hay collabs"}
      description={query || chips.length ? "Prueba con otra búsqueda o quita algún filtro." : "Cuando ganes una propuesta aparece aquí con sus piezas y fechas. También puedes crear una a mano."}
      action={
        query || chips.length ? (
          <Button variant="outline" size="sm" onClick={() => { setQuery(""); limpiar() }}>Quitar filtros</Button>
        ) : (
          <Button size="sm" onClick={() => setNueva(true)}><PlusIcon /> Nueva collab</Button>
        )
      }
    />
  )

  const eventos = React.useMemo(() => [...eventosDeCollabs(filtradas, marcas), ...eventosDeTareas(tareas, filtradas)], [filtradas, marcas, tareas])

  return (
    <PageBody className="gap-6 px-4 pb-28 md:px-[34px] md:pb-10">
      <PageHeader title="Collabs" description={`${activas.length} en marcha. Cada una con su brief, sus contenidos, sus materiales y sus tareas.`} />

      <Block className="min-h-[560px] p-0">
        <div className="flex flex-col gap-2 p-4 pb-3">
          <Toolbar>
            <ToolbarSearch placeholder="Buscar marca o campaña…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterMenu label="Estado" options={ESTADOS_COLLAB.map((e) => ({ value: e.id, label: e.label, count: collabs.filter((c) => c.estado === e.id).length }))} value={filtroEstado} onChange={setFiltroEstado} />
            <FilterMenu label="Tipo" options={(Object.keys(TIPOS_COLLAB) as TipoCollab[]).map((t) => ({ value: t, label: TIPOS_COLLAB[t].label }))} value={filtroTipo} onChange={setFiltroTipo} />
            <FilterMenu label="Marca" options={marcas.filter((m) => collabs.some((c) => c.marcaId === m.id)).map((m) => ({ value: m.id, label: m.nombre }))} value={filtroMarca} onChange={setFiltroMarca} />
            <ToolbarActions>
              <ViewSwitcher views={views} value={view} onChange={setView} />
              <Button onClick={() => setNueva(true)}>
                <PlusIcon /> Nueva collab
              </Button>
            </ToolbarActions>
          </Toolbar>
          <ActiveFilters chips={chips} onClear={limpiar} />
        </div>

        {view === "grid" && (
          <div className="px-4 pb-4">
            {filtradas.length === 0 ? (
              vacio
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-4">
                {filtradas.map((c) => {
                  const h = siguienteHito(c)
                  const cerrada = !COLLABS_ACTIVAS.includes(c.estado)
                  return (
                    <CollabCard
                      key={c.id}
                      brand={marca(c).nombre}
                      campaign={c.campana}
                      deliverables={describirEntregables(c)}
                      done={unidadesHechas(c)}
                      total={unidadesTotales(c)}
                      nextLabel={h ? h.label : cerrada ? estadoDe(ESTADOS_COLLAB, c.estado).label : "Todo entregado"}
                      nextDate={h?.fecha ?? c.hasta}
                      tint={c.tint}
                      coverUrl={c.coverUrl}
                      href={`/workspace/collabs/${c.id}`}
                      className={cn("w-auto", cerrada && "opacity-80 saturate-50 hover:opacity-100 hover:saturate-100")}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
        {view === "table" && (
          <div className="border-t">
            <DataTable rows={filtradas} columns={columnas} getRowId={(c) => c.id} onRowClick={abrir} emptyState={vacio} />
          </div>
        )}
        {view === "calendar" && (
          <div className="px-4 pb-4">
            <Agenda eventos={eventos} hoy={hoy} />
          </div>
        )}
      </Block>

      <NuevaCollabDialog
        open={nueva}
        onOpenChange={setNueva}
        marcas={marcas}
        hoy={hoy}
        onCreate={(c) => {
          setCollabs((cs) => [c, ...cs])
          toast.success("Collab creada: ahora rellena el brief")
          router.push(`/workspace/collabs/${c.id}/brief`)
        }}
      />
    </PageBody>
  )
}
