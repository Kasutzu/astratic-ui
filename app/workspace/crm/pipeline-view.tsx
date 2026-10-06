"use client"

import * as React from "react"
import { toast } from "sonner"
import { ArrowRightIcon, BanknoteIcon, CalendarClockIcon, KanbanSquareIcon, MailIcon, PlusIcon, ThumbsDownIcon, Trash2Icon, TrophyIcon, TriangleAlertIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { statusTextClass } from "@/lib/status"
import { filtrarFilas } from "@/lib/filtros/core"
import { ESTADOS_PROPUESTA, describirPiezas, estadoDe, type EstadoPropuesta, type Propuesta } from "@/lib/influencer/modelo"
import { bajoMinimo, cifrasPipeline, contactoDePropuesta, esAbierta, importeDe, recordatorioDe } from "@/lib/influencer/crm"
import { camposPropuesta } from "@/lib/influencer/campos"
import { eventosDePropuestas } from "@/lib/influencer/agenda"
import { marcaDe } from "@/lib/influencer/collabs"
import { soloFecha } from "@/lib/influencer/fechas"
import { usePageView } from "@/hooks/use-page-view"
import { useFiltrosAvanzados } from "@/hooks/use-filtros-avanzados"
import { useTableConfig } from "@/hooks/use-table-config"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageBody } from "@/components/app/page-header"
import { WorkGrid } from "@/components/app/work-grid"
import { FilterBar } from "@/components/app/filter-bar"
import type { FiltroRapido } from "@/components/app/quick-filters"
import { Section, SectionBody, SectionFooter, SectionHeader } from "@/components/app/section"
import { ColumnSettings } from "@/components/app/column-settings"
import { CellPrimary, DataTable, TablePagination, type Column } from "@/components/app/data-table"
import { RecordList, RecordListItem } from "@/components/app/record-list"
import { Kanban } from "@/components/app/kanban"
import { BulkBar } from "@/components/app/bulk-bar"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { InsightList, InsightStat, InsightsPanel } from "@/components/app/insights-panel"
import { StatRow, StatTile } from "@/components/influencer/stat-tile"
import { BrandMark } from "@/components/influencer/brand-mark"
import { Agenda } from "@/components/influencer/agenda"
import { useCrm } from "./crm-provider"
import { CrmHeader } from "./crm-header"
import { PropuestaSheet } from "./propuesta-sheet"
import { usePropuestaAcciones } from "./use-propuesta-acciones"

const POR_PAGINA = 20

type Tarjeta = Propuesta & { columnId: EstadoPropuesta }

const RAPIDOS: FiltroRapido[] = [
  { id: "campo:estado", clase: "campo", campo: "estado" },
  { id: "campo:marca", clase: "campo", campo: "marca" },
  { id: "campo:origen", clase: "campo", campo: "origen" },
  { id: "campo:formatos", clase: "campo", campo: "formatos" },
  { id: "guardado:con-presupuesto", clase: "guardado", label: "Con presupuesto", union: "y", condiciones: [{ campo: "presupuesto", op: "verdadero" }] },
]

/** El pipeline: la portada del CRM, con sus cifras arriba y las propuestas en tablero, tabla, lista o calendario. */
export function PipelineView({ abiertaInicial, nuevaInicial }: { abiertaInicial: string | null; nuevaInicial: boolean }) {
  const { propuestas, setPropuestas, marcas, contactos, perfil, hoy } = useCrm()
  const tarifas = perfil.tarifas
  const hoyFecha = soloFecha(hoy)
  const { view, setView, views } = usePageView("ws-pipeline", ["kanban", "table", "list", "calendar"])
  const campos = React.useMemo(() => camposPropuesta({ marcas, tarifas }), [marcas, tarifas])
  const av = useFiltrosAvanzados("ws-pipeline", campos, RAPIDOS)
  const [q, setQ] = React.useState("")
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set())
  const [pagina, setPagina] = React.useState(1)
  const acciones = usePropuestaAcciones({ abiertaInicial, nuevaInicial, alCambiar: () => setSeleccion(new Set()) })
  const { abiertaId, abrir } = acciones

  const marca = (p: Propuesta) => marcaDe(p, marcas)
  const importe = (p: Propuesta) => importeDe(p, tarifas)

  const filtradas = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    return filtrarFilas(propuestas, av.grupo, campos).filter((p) => {
      if (!s) return true
      const persona = contactoDePropuesta(p, contactos)?.nombre ?? ""
      return [p.campana, marcas.find((m) => m.id === p.marcaId)?.nombre ?? "", persona].some((t) => t.toLowerCase().includes(s))
    })
  }, [propuestas, av.grupo, campos, q, contactos, marcas])

  const cifras = cifrasPipeline(propuestas, tarifas, hoy)
  const abiertas = filtradas.filter(esAbierta)
  const valorAbierto = abiertas.reduce((a, p) => a + importe(p), 0)
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas)
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)
  const hayFiltro = q.trim() !== "" || av.hayCondiciones

  const importeCelda = (p: Propuesta) => (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
      {importe(p) > 0 ? fmt.eur(importe(p)) : p.ofrecen === 0 ? "Regalo" : "—"}
      {bajoMinimo(p, tarifas) && <TriangleAlertIcon className="size-3.5 text-warning" aria-label="Por debajo de tu mínimo" />}
    </span>
  )

  const recordatorio = (p: Propuesta, clase?: string) => {
    const r = recordatorioDe(p, hoy)
    if (!r) return <span className="text-xs text-muted-foreground">—</span>
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-1 text-xs font-medium", statusTextClass[r.tone], r.tone === "neutral" && "font-normal text-muted-foreground", clase)}>
        <CalendarClockIcon className="size-3 flex-none" />
        <span className="truncate">{r.label}</span>
      </span>
    )
  }

  const columnas = React.useMemo<Column<Propuesta>[]>(
    () => [
      { id: "marca", header: "Marca y campaña", minWidth: 240, sortValue: (p) => marca(p).nombre, cell: (p) => <CellPrimary leading={<BrandMark name={marca(p).nombre} tint={marca(p).tint} size="sm" />} title={marca(p).nombre} subtitle={p.campana} /> },
      { id: "estado", header: "Estado", sortValue: (p) => ESTADOS_PROPUESTA.findIndex((e) => e.id === p.estado), cell: (p) => <StatusBadge tone={estadoDe(ESTADOS_PROPUESTA, p.estado).tone}>{estadoDe(ESTADOS_PROPUESTA, p.estado).label}</StatusBadge> },
      { id: "importe", header: "Importe", align: "right", sortValue: (p) => importe(p), cell: importeCelda },
      { id: "siguiente", header: "Siguiente paso", minWidth: 220, sortValue: (p) => p.siguienteFecha ?? "9999", cell: (p) => recordatorio(p) },
      { id: "contacto", header: "Contacto", hideBelow: "xl", sortValue: (p) => contactoDePropuesta(p, contactos)?.nombre ?? "", cell: (p) => <span className="text-muted-foreground">{contactoDePropuesta(p, contactos)?.nombre ?? "—"}</span> },
      { id: "piezas", header: "Piden", hideBelow: "2xl", cell: (p) => <span className="text-muted-foreground">{describirPiezas(p.piezas)}</span> },
      { id: "origen", header: "Origen", hideBelow: "2xl", sortValue: (p) => p.origen, cell: (p) => <span className="text-xs text-muted-foreground">{p.origen === "red" ? "Red Astratic" : p.origen === "propia" ? "La busqué yo" : p.origen === "mediakit" ? "Media kit" : "Me escribieron"}</span> },
      { id: "ultimoContacto", header: "Último contacto", align: "right", hideBelow: "lg", sortValue: (p) => p.ultimoContacto, cell: (p) => <span className="text-xs text-muted-foreground">{fmt.date(p.ultimoContacto)}</span> },
      { id: "ventana", header: "Publicación", hideBelow: "2xl", sortValue: (p) => p.desde ?? "9999", cell: (p) => <span className="text-xs text-muted-foreground">{p.desde ? `${fmt.date(p.desde)}${p.hasta ? ` – ${fmt.date(p.hasta)}` : ""}` : "—"}</span> },
    ],
    // Las celdas leen marcas, contactos y tarifas del CRM: se rehacen cuando cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marcas, contactos, tarifas, hoy],
  )
  const cols = useTableConfig("ws-pipeline", columnas)

  const vacio = (
    <EmptyState
      icon={KanbanSquareIcon}
      title={hayFiltro ? "Ninguna propuesta coincide" : "Aún no hay propuestas"}
      description={hayFiltro ? "Prueba con otra búsqueda o quita algún filtro." : "Apunta aquí cada marca que te escribe; las oportunidades de la red entran solas."}
      action={
        hayFiltro ? (
          <Button variant="outline" size="sm" onClick={() => { setQ(""); av.limpiar() }}>Quitar filtros</Button>
        ) : (
          <Button size="sm" onClick={() => acciones.setNueva(true)}><PlusIcon /> Nueva propuesta</Button>
        )
      }
    />
  )

  const tarjeta = (p: Tarjeta) => (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-semibold">{marca(p).nombre}</span>
        <span className="flex-none text-[11px] text-muted-foreground tabular-nums" title="Último contacto">{fmt.date(p.ultimoContacto)}</span>
      </div>
      <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{p.campana}</span>
        <span className="flex-none text-foreground">{importeCelda(p)}</span>
      </div>
      {recordatorio(p, "text-[11px]")}
    </div>
  )

  const porFase = ESTADOS_PROPUESTA.filter((e) => e.id !== "ganada" && e.id !== "perdida")
  const proximos = propuestas.filter((p) => esAbierta(p) && p.siguienteFecha).sort((a, b) => (a.siguienteFecha ?? "").localeCompare(b.siguienteFecha ?? "")).slice(0, 5)
  const cerradas = propuestas.filter((p) => !esAbierta(p))

  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <CrmHeader description="Tus propuestas por fase: arrastra las tarjetas para avanzar y abre una para ver todo lo hablado." />

      <WorkGrid
        stats={
          <StatRow>
            <StatTile icon={BanknoteIcon} tint="sky" label="Pipeline abierto" value={fmt.eur(cifras.valorAbierto)} hint={`${cifras.abiertas} propuestas abiertas`} />
            <StatTile icon={TrophyIcon} tint="mint" label="Ganado · 30 días" value={fmt.eur(cifras.ganado30)} hint={`${cifras.ganadas30} ${cifras.ganadas30 === 1 ? "ganada" : "ganadas"} · cierras el ${cifras.tasaCierre} %`} />
            <StatTile icon={CalendarClockIcon} tint="peach" label="Pasos para hoy" value={cifras.pasosHoy} hint={cifras.pasosVencidos ? `${cifras.pasosVencidos} vencidos` : "Al día"} />
            <StatTile icon={MailIcon} tint="rose" label="Sin respuesta" value={cifras.sinRespuesta} hint="Enviadas hace más de 7 días" />
          </StatRow>
        }
        toolbar={
          <FilterBar
            filtros={av}
            campos={campos}
            filas={filtradas}
            objeto="las propuestas"
            buscador={{ value: q, onChange: setQ, placeholder: "Buscar marca, campaña o persona…" }}
            vistas={{ views, value: view, onChange: setView }}
            onLimpiar={() => setQ("")}
            actions={<Button onClick={() => acciones.setNueva(true)}><PlusIcon /> Nueva propuesta</Button>}
          />
        }
        aside={
          <InsightsPanel
            storageKey="ws-pipeline"
            blocks={[
              {
                id: "fases",
                title: "Por fase",
                icon: KanbanSquareIcon,
                render: () => (
                  <ul className="flex flex-col gap-2">
                    {porFase.map((e) => {
                      const en = propuestas.filter((p) => p.estado === e.id)
                      const total = propuestas.filter(esAbierta).length
                      return (
                        <li key={e.id} className="grid text-xs">
                          <span className="flex items-center justify-between">
                            <span>{e.label}</span>
                            <span className="tabular-nums text-muted-foreground">{en.length} · {fmt.eur(en.reduce((a, p) => a + importe(p), 0))}</span>
                          </span>
                          <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <span className="block h-full rounded-full bg-brand" style={{ width: `${total ? (en.length / total) * 100 : 0}%` }} />
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ),
              },
              {
                id: "proximos",
                title: "Próximos pasos",
                icon: CalendarClockIcon,
                render: () =>
                  proximos.length ? (
                    <InsightList
                      items={proximos.map((p) => ({
                        key: p.id,
                        title: <button type="button" className="text-left hover:underline" onClick={() => abrir(p.id)}>{marca(p).nombre}</button>,
                        subtitle: p.siguientePaso,
                        trailing: <span className={cn((p.siguienteFecha ?? "") < hoyFecha ? "text-danger" : (p.siguienteFecha ?? "") === hoyFecha ? "text-warning" : "text-muted-foreground")}>{fmt.date(p.siguienteFecha ?? "")}</span>,
                      }))}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin pasos con fecha. Ponlos desde la ficha de cada propuesta.</p>
                  ),
              },
              {
                id: "resultados",
                title: "Cerradas",
                icon: TrophyIcon,
                render: () => (
                  <div className="divide-y">
                    <InsightStat label="Ganadas" value={cerradas.filter((p) => p.estado === "ganada").length} sub={fmt.eur(cerradas.filter((p) => p.estado === "ganada").reduce((a, p) => a + importe(p), 0))} />
                    <InsightStat label="Perdidas" value={cerradas.filter((p) => p.estado === "perdida").length} />
                    <InsightStat label="Tasa de cierre" value={`${cifras.tasaCierre} %`} />
                  </div>
                ),
              },
            ]}
          />
        }
      >
        <Section className="min-h-[560px]">
          <SectionHeader
            icon={KanbanSquareIcon}
            title="Propuestas"
            count={filtradas.length}
            meta={`${fmt.eur(valorAbierto)} abierto`}
            action={view === "table" ? <ColumnSettings config={cols} /> : undefined}
          />
          <SectionBody className={cn(av.filtros.pending && "pointer-events-none opacity-60", view === "calendar" && "p-4")}>
            {view === "kanban" &&
              (filtradas.length === 0 && !hayFiltro ? (
                vacio
              ) : (
                <Kanban<Tarjeta>
                  columns={ESTADOS_PROPUESTA.map((e) => ({ id: e.id, title: e.label, tone: e.tone, meta: fmt.eur(filtradas.filter((p) => p.estado === e.id).reduce((a, p) => a + importe(p), 0)) }))}
                  items={filtradas.map((p) => ({ ...p, columnId: p.estado }))}
                  onChange={(next) => {
                    const movida = next.find((n) => propuestas.find((p) => p.id === n.id)?.estado !== n.columnId)
                    if (movida) acciones.cambiarEstado([movida.id], movida.columnId)
                  }}
                  onCardClick={(p) => abrir(p.id)}
                  openId={abiertaId}
                  storageKey="ws-pipeline"
                  defaultCollapsed={["ganada", "perdida"]}
                  emptyColumn="Nada aquí"
                  density="compact"
                  renderCard={tarjeta}
                />
              ))}
            {view === "table" && <DataTable rows={visibles} columns={cols.columnas} getRowId={(p) => p.id} selectable selected={seleccion} onSelectedChange={setSeleccion} onRowClick={(p) => abrir(p.id)} activeId={abiertaId} emptyState={vacio} />}
            {view === "list" &&
              (filtradas.length === 0 ? (
                vacio
              ) : (
                <RecordList>
                  {visibles.map((p) => (
                    <RecordListItem
                      key={p.id}
                      leading={<BrandMark name={marca(p).nombre} tint={marca(p).tint} size="sm" />}
                      title={marca(p).nombre}
                      subtitle={`${p.campana} · ${recordatorioDe(p, hoy)?.label ?? describirPiezas(p.piezas)}`}
                      status={<StatusBadge tone={estadoDe(ESTADOS_PROPUESTA, p.estado).tone}>{estadoDe(ESTADOS_PROPUESTA, p.estado).label}</StatusBadge>}
                      value={importe(p) > 0 ? fmt.eur(importe(p)) : undefined}
                      selected={seleccion.has(p.id) || p.id === abiertaId}
                      onClick={() => abrir(p.id)}
                    />
                  ))}
                </RecordList>
              ))}
            {view === "calendar" && <Agenda eventos={eventosDePropuestas(filtradas, marcas)} hoy={hoy} onSelect={(e) => abrir(e.id.replace(/-(paso|ventana)$/, ""))} />}
          </SectionBody>
          {(view === "table" || view === "list") && filtradas.length > 0 && (
            <SectionFooter>
              <TablePagination page={paginaActual} pageCount={paginas} onPageChange={setPagina} total={filtradas.length} pageSize={POR_PAGINA} />
            </SectionFooter>
          )}
          <BulkBar count={seleccion.size} onClear={() => setSeleccion(new Set())}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm"><ArrowRightIcon /> Cambiar estado</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {ESTADOS_PROPUESTA.filter((e) => e.id !== "perdida").map((e) => (
                  <DropdownMenuItem key={e.id} onSelect={() => acciones.cambiarEstado([...seleccion], e.id)}>{e.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={() => acciones.perder([...seleccion])}><ThumbsDownIcon /> Perdidas</Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={() => {
                const ids = [...seleccion]
                const previas = propuestas
                setPropuestas((ps) => ps.filter((p) => !ids.includes(p.id)))
                setSeleccion(new Set())
                toast.success(ids.length === 1 ? "Propuesta eliminada" : `${ids.length} propuestas eliminadas`, { action: { label: "Deshacer", onClick: () => setPropuestas(previas) } })
              }}
            >
              <Trash2Icon /> Eliminar
            </Button>
          </BulkBar>
        </Section>
      </WorkGrid>

      <PropuestaSheet lista={filtradas} acciones={acciones} />
      {acciones.dialogos}
    </PageBody>
  )
}
