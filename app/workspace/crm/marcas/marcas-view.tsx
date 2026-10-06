"use client"

import * as React from "react"
import { toast } from "sonner"
import { BuildingIcon, CalendarClockIcon, DownloadIcon, HandshakeIcon, PlusIcon, Trash2Icon, UserRoundXIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { filtrarFilas } from "@/lib/filtros/core"
import { RELACIONES_MARCA, estadoDe, type Marca } from "@/lib/influencer/modelo"
import { camposMarca } from "@/lib/influencer/campos"
import { diasDeAtribucion, textoAtribucion, type ResumenMarca } from "@/lib/influencer/crm"
import { usePageView } from "@/hooks/use-page-view"
import { useFiltrosAvanzados } from "@/hooks/use-filtros-avanzados"
import { useTableConfig } from "@/hooks/use-table-config"
import { Button } from "@/components/ui/button"
import { PageBody } from "@/components/app/page-header"
import { WorkGrid } from "@/components/app/work-grid"
import { FilterBar } from "@/components/app/filter-bar"
import type { FiltroRapido } from "@/components/app/quick-filters"
import { Section, SectionBody, SectionFooter, SectionHeader } from "@/components/app/section"
import { ColumnSettings } from "@/components/app/column-settings"
import { CellPrimary, DataTable, TablePagination, type Column } from "@/components/app/data-table"
import { RecordList, RecordListItem } from "@/components/app/record-list"
import { BulkBar } from "@/components/app/bulk-bar"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { InsightList, InsightsPanel } from "@/components/app/insights-panel"
import { BrandMark } from "@/components/influencer/brand-mark"
import { useCrm } from "../crm-provider"
import { CrmHeader } from "../crm-header"
import { useRegistroAbierto } from "../use-registro"
import { descargarCsv } from "../exportar"
import { MarcaDialog } from "./marca-dialog"
import { MarcaSheet } from "./marca-sheet"
import { useBorrarMarcas } from "./use-borrar-marcas"

const POR_PAGINA = 25

const RAPIDOS: FiltroRapido[] = [
  { id: "campo:relacion", clase: "campo", campo: "relacion" },
  { id: "campo:sector", clase: "campo", campo: "sector" },
  { id: "campo:atribucion", clase: "campo", campo: "atribucion" },
  { id: "guardado:sin-contactos", clase: "guardado", label: "Sin contactos", union: "y", condiciones: [{ campo: "contactos", op: "es", valor: "0" }] },
]

/** La base de datos de marcas: las que le escriben, las de la red y las que quiere trabajar. */
export function MarcasView({ abiertaInicial, nuevaInicial }: { abiertaInicial: string | null; nuevaInicial: boolean }) {
  const { marcas, resumenes, hoy } = useCrm()
  const { view, setView, views } = usePageView("ws-marcas", ["table", "list", "grid"])
  const campos = React.useMemo(() => camposMarca({ marcas, resumenes }), [marcas, resumenes])
  const av = useFiltrosAvanzados("ws-marcas", campos, RAPIDOS)
  const [q, setQ] = React.useState("")
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set())
  const [pagina, setPagina] = React.useState(1)
  const [abiertaId, abrir] = useRegistroAbierto(abiertaInicial)
  const [nueva, setNueva] = React.useState(nuevaInicial)
  const borrar = useBorrarMarcas({ alBorrar: () => { setSeleccion(new Set()); abrir(null) } })

  const r = (m: Marca): ResumenMarca | undefined => resumenes.get(m.id)

  const filtradas = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    return filtrarFilas(marcas, av.grupo, campos)
      .filter((m) => !s || [m.nombre, m.sector, resumenes.get(m.id)?.principal?.nombre ?? ""].some((t) => t.toLowerCase().includes(s)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  }, [marcas, av.grupo, campos, q, resumenes])

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas)
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)
  const hayFiltro = q.trim() !== "" || av.hayCondiciones

  const relacion = (m: Marca) => {
    const e = estadoDe(RELACIONES_MARCA, r(m)?.relacion ?? "sin-propuestas")
    return <StatusBadge tone={e.tone}>{e.label}</StatusBadge>
  }

  const columnas = React.useMemo<Column<Marca>[]>(
    () => [
      { id: "marca", header: "Marca", minWidth: 220, sortValue: (m) => m.nombre, cell: (m) => <CellPrimary leading={<BrandMark name={m.nombre} tint={m.tint} size="sm" />} title={m.nombre} subtitle={m.sector || "Sin sector"} /> },
      { id: "relacion", header: "Relación", sortValue: (m) => RELACIONES_MARCA.findIndex((e) => e.id === resumenes.get(m.id)?.relacion), cell: relacion },
      { id: "contacto", header: "Contacto principal", hideBelow: "lg", sortValue: (m) => resumenes.get(m.id)?.principal?.nombre ?? "", cell: (m) => { const c = resumenes.get(m.id)?.principal; return c ? <span className="grid leading-tight"><span>{c.nombre}</span><span className="text-xs text-muted-foreground">{c.email ?? c.cargo ?? "Sin email"}</span></span> : <span className="text-xs text-warning">Sin contacto</span> } },
      { id: "abiertas", header: "Abiertas", align: "right", sortValue: (m) => resumenes.get(m.id)?.valorAbierto ?? 0, cell: (m) => { const x = resumenes.get(m.id); return x?.propuestasAbiertas ? <span className="tabular-nums">{x.propuestasAbiertas} · {x.valorAbierto ? <span className="font-semibold">{fmt.eur(x.valorAbierto)}</span> : <span className="text-muted-foreground">sin importe</span>}</span> : <span className="text-muted-foreground">—</span> } },
      { id: "facturado", header: "Facturado", align: "right", hideBelow: "xl", sortValue: (m) => resumenes.get(m.id)?.facturado ?? 0, cell: (m) => <span className="tabular-nums">{resumenes.get(m.id)?.facturado ? fmt.eur(resumenes.get(m.id)?.facturado ?? 0) : "—"}</span> },
      { id: "atribucion", header: "Atribución", hideBelow: "2xl", sortValue: (m) => m.atribucionHasta ?? (m.atribucion === "red" ? "0" : "9999"), cell: (m) => <span className="text-xs text-muted-foreground">{textoAtribucion(m)}</span> },
      { id: "ultimo", header: "Último contacto", align: "right", hideBelow: "lg", sortValue: (m) => resumenes.get(m.id)?.ultimoContacto ?? "", cell: (m) => <span className="text-xs text-muted-foreground">{resumenes.get(m.id)?.ultimoContacto ? fmt.date(resumenes.get(m.id)?.ultimoContacto ?? "") : "—"}</span> },
      { id: "collabs", header: "Collabs", align: "right", hideBelow: "2xl", sortValue: (m) => resumenes.get(m.id)?.collabs ?? 0, cell: (m) => <span className="tabular-nums text-muted-foreground">{resumenes.get(m.id)?.collabs || "—"}</span> },
      { id: "creada", header: "Añadida", align: "right", hideBelow: "2xl", sortValue: (m) => m.creadaEl, cell: (m) => <span className="text-xs text-muted-foreground">{fmt.date(m.creadaEl)}</span> },
    ],
    // `relacion` solo lee `resumenes`, que ya está en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resumenes],
  )
  const cols = useTableConfig("ws-marcas", columnas)

  const exportar = (lista: Marca[]) =>
    descargarCsv(
      "marcas",
      ["Marca", "Sector", "Relación", "Contacto", "Email", "Web", "Instagram", "Atribución", "Propuestas abiertas", "Valor abierto", "Facturado", "Último contacto"],
      lista.map((m) => {
        const x = r(m)
        return [m.nombre, m.sector, estadoDe(RELACIONES_MARCA, x?.relacion ?? "sin-propuestas").label, x?.principal?.nombre, x?.principal?.email, m.web, m.instagram, textoAtribucion(m), x?.propuestasAbiertas, x?.valorAbierto, x?.facturado, x?.ultimoContacto?.slice(0, 10)]
      }),
    )

  const vacio = (
    <EmptyState
      icon={BuildingIcon}
      title={hayFiltro ? "Ninguna marca coincide" : "Aún no tienes marcas"}
      description={hayFiltro ? "Prueba con otra búsqueda o quita algún filtro." : "Añade las marcas que te escriben y las que quieres trabajar: aquí tendrás a su gente y todo lo hablado."}
      action={hayFiltro ? <Button variant="outline" size="sm" onClick={() => { setQ(""); av.limpiar() }}>Quitar filtros</Button> : <Button size="sm" onClick={() => setNueva(true)}><PlusIcon /> Nueva marca</Button>}
    />
  )

  const propiasPorCaducar = marcas
    .filter((m) => diasDeAtribucion(m, hoy) !== null)
    .sort((a, b) => (a.atribucionHasta ?? "").localeCompare(b.atribucionHasta ?? ""))
    .slice(0, 4)
  // Las de la red las lleva Astratic: no hace falta tener a quién escribir.
  const sinPersona = marcas.filter((m) => m.atribucion === "propia" && (!r(m)?.principal || (!r(m)?.principal?.email && !r(m)?.principal?.instagram)))

  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <CrmHeader
        description="Tus marcas: las que te escriben, las de la red y las que quieres trabajar, con su gente y lo hablado."
        actions={<Button variant="outline" onClick={() => exportar(filtradas)} disabled={!filtradas.length}><DownloadIcon /> Exportar</Button>}
      />
      <WorkGrid
        toolbar={
          <FilterBar
            filtros={av}
            campos={campos}
            filas={filtradas}
            objeto="las marcas"
            buscador={{ value: q, onChange: setQ, placeholder: "Buscar marca, sector o persona…" }}
            vistas={{ views, value: view, onChange: setView }}
            onLimpiar={() => setQ("")}
            actions={<Button onClick={() => setNueva(true)}><PlusIcon /> Nueva marca</Button>}
          />
        }
        aside={
          <InsightsPanel
            storageKey="ws-marcas"
            blocks={[
              {
                id: "relacion",
                title: "Por relación",
                icon: HandshakeIcon,
                render: () => (
                  <ul className="flex flex-col gap-2">
                    {RELACIONES_MARCA.map((e) => {
                      const n = marcas.filter((m) => r(m)?.relacion === e.id).length
                      return (
                        <li key={e.id} className="grid text-xs">
                          <span className="flex items-center justify-between"><span>{e.label}</span><span className="tabular-nums text-muted-foreground">{n}</span></span>
                          <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-brand" style={{ width: `${marcas.length ? (n / marcas.length) * 100 : 0}%` }} /></span>
                        </li>
                      )
                    })}
                  </ul>
                ),
              },
              {
                id: "atribucion",
                title: "Tuyas: atribución",
                icon: CalendarClockIcon,
                render: () =>
                  propiasPorCaducar.length ? (
                    <InsightList
                      items={propiasPorCaducar.map((m) => {
                        const dias = diasDeAtribucion(m, hoy) ?? 0
                        return { key: m.id, title: <button type="button" className="text-left hover:underline" onClick={() => abrir(m.id)}>{m.nombre}</button>, subtitle: `Hasta el ${fmt.date(m.atribucionHasta ?? "")}`, trailing: <span className={cn(dias < 60 ? "text-warning" : "text-muted-foreground")}>{dias} días</span> }
                      })}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">Las marcas que traes tú quedan a tu nombre 12 meses: aquí verás cuándo caduca cada una.</p>
                  ),
              },
              {
                id: "sin-persona",
                title: "Sin forma de escribirles",
                icon: UserRoundXIcon,
                render: () =>
                  sinPersona.length ? (
                    <InsightList items={sinPersona.slice(0, 5).map((m) => ({ key: m.id, title: <button type="button" className="text-left hover:underline" onClick={() => abrir(m.id)}>{m.nombre}</button>, subtitle: r(m)?.principal ? `${r(m)?.principal?.nombre} no tiene email` : "Sin persona de contacto" }))} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Todas tus marcas tienen a alguien a quien escribir.</p>
                  ),
              },
            ]}
          />
        }
      >
        <Section className="min-h-[560px]">
          <SectionHeader icon={BuildingIcon} title="Marcas" count={filtradas.length} action={view === "table" ? <ColumnSettings config={cols} /> : undefined} />
          <SectionBody className={cn(av.filtros.pending && "pointer-events-none opacity-60", view === "grid" && "p-4")}>
            {view === "table" && <DataTable rows={visibles} columns={cols.columnas} getRowId={(m) => m.id} selectable selected={seleccion} onSelectedChange={setSeleccion} onRowClick={(m) => abrir(m.id)} activeId={abiertaId} emptyState={vacio} />}
            {view === "list" &&
              (filtradas.length === 0 ? (
                vacio
              ) : (
                <RecordList>
                  {visibles.map((m) => (
                    <RecordListItem
                      key={m.id}
                      leading={<BrandMark name={m.nombre} tint={m.tint} size="sm" />}
                      title={m.nombre}
                      subtitle={[m.sector, r(m)?.principal?.nombre].filter(Boolean).join(" · ")}
                      status={relacion(m)}
                      value={r(m)?.valorAbierto ? fmt.eur(r(m)?.valorAbierto ?? 0) : undefined}
                      selected={seleccion.has(m.id) || m.id === abiertaId}
                      onClick={() => abrir(m.id)}
                    />
                  ))}
                </RecordList>
              ))}
            {view === "grid" &&
              (filtradas.length === 0 ? (
                vacio
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {visibles.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => abrir(m.id)}
                      className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/60", m.id === abiertaId && "border-brand bg-brand-soft")}
                    >
                      <span className="flex items-center gap-3">
                        <BrandMark name={m.nombre} tint={m.tint} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{m.nombre}</span>
                          <span className="block truncate text-xs text-muted-foreground">{m.sector || "Sin sector"}</span>
                        </span>
                        {relacion(m)}
                      </span>
                      <span className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                        <span className="truncate">{r(m)?.principal?.nombre ?? "Sin contacto"}</span>
                        <span className="tabular-nums">{r(m)?.propuestasAbiertas ? `${r(m)?.propuestasAbiertas} abiertas · ${fmt.eur(r(m)?.valorAbierto ?? 0)}` : r(m)?.facturado ? `${fmt.eur(r(m)?.facturado ?? 0)} facturado` : textoAtribucion(m)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
          </SectionBody>
          {filtradas.length > 0 && (
            <SectionFooter>
              <TablePagination page={paginaActual} pageCount={paginas} onPageChange={setPagina} total={filtradas.length} pageSize={POR_PAGINA} />
            </SectionFooter>
          )}
          <BulkBar count={seleccion.size} onClear={() => setSeleccion(new Set())}>
            <Button variant="ghost" size="sm" onClick={() => exportar(marcas.filter((m) => seleccion.has(m.id)))}><DownloadIcon /> Exportar</Button>
            <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => borrar.pedir([...seleccion])}><Trash2Icon /> Eliminar</Button>
          </BulkBar>
        </Section>
      </WorkGrid>

      <MarcaSheet lista={filtradas} abiertaId={abiertaId} abrir={abrir} onBorrar={(id) => borrar.pedir([id])} />
      <MarcaDialog open={nueva} onOpenChange={setNueva} onCreada={(m) => { abrir(m.id); toast.success(`${m.nombre} añadida`) }} />
      {borrar.dialogo}
    </PageBody>
  )
}
