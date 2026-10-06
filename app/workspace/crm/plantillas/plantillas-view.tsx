"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BracesIcon, CopyPlusIcon, EllipsisIcon, FileTextIcon, MailIcon, MessageCircleIcon, MessageSquareTextIcon, PlusIcon, StarIcon, Trash2Icon, TrendingUpIcon, type LucideIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { filtrarFilas } from "@/lib/filtros/core"
import { CANALES_PLANTILLA, USOS_PLANTILLA, type CanalPlantilla, type Plantilla } from "@/lib/influencer/modelo"
import { camposPlantilla } from "@/lib/influencer/campos"
import { GRUPOS_VARIABLE, VARIABLES } from "@/lib/influencer/plantillas"
import { idNuevo } from "@/lib/influencer/tareas"
import { usePageView } from "@/hooks/use-page-view"
import { useFiltrosAvanzados } from "@/hooks/use-filtros-avanzados"
import { useTableConfig } from "@/hooks/use-table-config"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageBody } from "@/components/app/page-header"
import { WorkGrid } from "@/components/app/work-grid"
import { FilterBar } from "@/components/app/filter-bar"
import type { FiltroRapido } from "@/components/app/quick-filters"
import { Section, SectionBody, SectionHeader } from "@/components/app/section"
import { ColumnSettings } from "@/components/app/column-settings"
import { CellPrimary, DataTable, type Column } from "@/components/app/data-table"
import { BulkBar } from "@/components/app/bulk-bar"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { InsightList, InsightsPanel } from "@/components/app/insights-panel"
import { useCrm } from "../crm-provider"
import { CrmHeader } from "../crm-header"

export const ICONO_CANAL: Record<CanalPlantilla, LucideIcon> = { email: MailIcon, dm: MessageCircleIcon, whatsapp: MessageSquareTextIcon }

const RAPIDOS: FiltroRapido[] = [
  { id: "campo:uso", clase: "campo", campo: "uso" },
  { id: "campo:canal", clase: "campo", campo: "canal" },
  { id: "guardado:favoritas", clase: "guardado", label: "Favoritas", union: "y", condiciones: [{ campo: "favorita", op: "verdadero" }] },
]

/** El directorio de plantillas: cada una se abre en su página, con el editor y la vista previa. */
export function PlantillasView() {
  const router = useRouter()
  const { plantillas, setPlantillas, hoy } = useCrm()
  const { view, setView, views } = usePageView("ws-plantillas", ["grid", "table"])
  const campos = React.useMemo(() => camposPlantilla(), [])
  const av = useFiltrosAvanzados("ws-plantillas", campos, RAPIDOS)
  const [q, setQ] = React.useState("")
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set())
  const [borrando, setBorrando] = React.useState<string[] | null>(null)

  const filtradas = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    return filtrarFilas(plantillas, av.grupo, campos)
      .filter((p) => !s || [p.nombre, p.asunto ?? "", p.cuerpo].some((t) => t.toLowerCase().includes(s)))
      .sort((a, b) => Number(b.favorita) - Number(a.favorita) || Object.keys(USOS_PLANTILLA).indexOf(a.uso) - Object.keys(USOS_PLANTILLA).indexOf(b.uso) || a.nombre.localeCompare(b.nombre, "es"))
  }, [plantillas, av.grupo, campos, q])
  const hayFiltro = q.trim() !== "" || av.hayCondiciones

  const abrir = (id: string) => router.push(`/workspace/crm/plantillas/${id}`)
  const nueva = () => {
    const p: Plantilla = { id: idNuevo("pl"), nombre: "Plantilla sin nombre", uso: "primer-contacto", canal: "email", asunto: "", cuerpo: "Hola {{contacto.nombre}},\n\n\n\nUn abrazo,\n{{yo.nombrePila}}", favorita: false, usos: 0, creadaEl: hoy, actualizadaEl: hoy }
    setPlantillas((ps) => [p, ...ps])
    abrir(p.id)
  }
  const duplicar = (p: Plantilla) => {
    const copia: Plantilla = { ...p, id: idNuevo("pl"), nombre: `${p.nombre} (copia)`, favorita: false, usos: 0, ultimoUso: undefined, creadaEl: hoy, actualizadaEl: hoy }
    setPlantillas((ps) => [copia, ...ps])
    toast.success("Plantilla duplicada", { action: { label: "Abrir", onClick: () => abrir(copia.id) } })
  }
  const favorita = (ids: string[], valor: boolean) => setPlantillas((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, favorita: valor } : p)))
  const eliminar = (ids: string[]) => {
    const antes = plantillas
    setPlantillas((ps) => ps.filter((p) => !ids.includes(p.id)))
    setSeleccion(new Set())
    toast.success(ids.length === 1 ? "Plantilla eliminada" : `${ids.length} plantillas eliminadas`, { action: { label: "Deshacer", onClick: () => setPlantillas(antes) } })
  }

  const menu = (p: Plantilla) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Más acciones" onClick={(e) => e.stopPropagation()}><EllipsisIcon /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => favorita([p.id], !p.favorita)}><StarIcon /> {p.favorita ? "Quitar de favoritas" : "Marcar como favorita"}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => duplicar(p)}><CopyPlusIcon /> Duplicar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setBorrando([p.id])}><Trash2Icon /> Eliminar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const columnas = React.useMemo<Column<Plantilla>[]>(
    () => [
      {
        id: "nombre",
        header: "Plantilla",
        minWidth: 260,
        sortValue: (p) => p.nombre,
        cell: (p) => {
          const Icono = ICONO_CANAL[p.canal]
          return <CellPrimary leading={<span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground"><Icono className="size-4" /></span>} title={<span className="inline-flex items-center gap-1.5">{p.nombre}{p.favorita && <StarIcon className="size-3.5 fill-current text-warning" aria-label="Favorita" />}</span>} subtitle={p.asunto || p.cuerpo.split("\n")[0]} />
        },
      },
      { id: "uso", header: "Para qué", sortValue: (p) => Object.keys(USOS_PLANTILLA).indexOf(p.uso), cell: (p) => <StatusBadge tone="neutral">{USOS_PLANTILLA[p.uso]}</StatusBadge> },
      { id: "canal", header: "Canal", hideBelow: "lg", sortValue: (p) => p.canal, cell: (p) => <span className="text-muted-foreground">{CANALES_PLANTILLA[p.canal]}</span> },
      { id: "usos", header: "Usada", align: "right", sortValue: (p) => p.usos, cell: (p) => <span className="tabular-nums">{p.usos} {p.usos === 1 ? "vez" : "veces"}</span> },
      { id: "ultimoUso", header: "Último uso", align: "right", hideBelow: "xl", sortValue: (p) => p.ultimoUso ?? "", cell: (p) => <span className="text-xs text-muted-foreground">{p.ultimoUso ? fmt.date(p.ultimoUso) : "—"}</span> },
      { id: "editada", header: "Editada", align: "right", hideBelow: "2xl", sortValue: (p) => p.actualizadaEl, cell: (p) => <span className="text-xs text-muted-foreground">{fmt.date(p.actualizadaEl)}</span> },
    ],
    [],
  )
  const cols = useTableConfig("ws-plantillas", columnas)

  const vacio = (
    <EmptyState
      icon={FileTextIcon}
      title={hayFiltro ? "Ninguna plantilla coincide" : "Aún no tienes plantillas"}
      description={hayFiltro ? "Prueba con otra búsqueda o quita algún filtro." : "Guarda los emails y mensajes que repites: el primer contacto, las tarifas, el seguimiento…"}
      action={hayFiltro ? <Button variant="outline" size="sm" onClick={() => { setQ(""); av.limpiar() }}>Quitar filtros</Button> : <Button size="sm" onClick={nueva}><PlusIcon /> Nueva plantilla</Button>}
    />
  )

  const masUsadas = [...plantillas].sort((a, b) => b.usos - a.usos).slice(0, 4)

  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <CrmHeader description="Tus emails y mensajes de siempre, con variables que se rellenan solas al escribir a una marca." />
      <WorkGrid
        toolbar={
          <FilterBar
            filtros={av}
            campos={campos}
            filas={filtradas}
            objeto="las plantillas"
            buscador={{ value: q, onChange: setQ, placeholder: "Buscar en las plantillas…" }}
            vistas={{ views, value: view, onChange: setView }}
            onLimpiar={() => setQ("")}
            actions={<Button onClick={nueva}><PlusIcon /> Nueva plantilla</Button>}
          />
        }
        aside={
          <InsightsPanel
            storageKey="ws-plantillas"
            blocks={[
              {
                id: "usadas",
                title: "Las que más usas",
                icon: TrendingUpIcon,
                render: () => <InsightList items={masUsadas.map((p) => ({ key: p.id, title: <button type="button" className="text-left hover:underline" onClick={() => abrir(p.id)}>{p.nombre}</button>, subtitle: USOS_PLANTILLA[p.uso], trailing: <span className="tabular-nums text-muted-foreground">{p.usos}</span> }))} />,
              },
              {
                id: "variables",
                title: "Variables",
                icon: BracesIcon,
                render: () => (
                  <div className="flex flex-col gap-3 text-xs">
                    <p className="text-muted-foreground">Escríbelas entre llaves dobles y se rellenan con la marca, la persona y la propuesta a la que escribes.</p>
                    {GRUPOS_VARIABLE.map((g) => (
                      <div key={g}>
                        <p className="mb-1 font-medium">{g}</p>
                        <ul className="flex flex-col gap-0.5">
                          {VARIABLES.filter((v) => v.grupo === g).map((v) => (
                            <li key={v.clave} className="flex justify-between gap-2">
                              <code className="font-mono text-[11px] text-brand">{`{{${v.clave}}}`}</code>
                              <span className="truncate text-muted-foreground">{v.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        }
      >
        <Section className="min-h-[560px]">
          <SectionHeader icon={FileTextIcon} title="Plantillas" count={filtradas.length} action={view === "table" ? <ColumnSettings config={cols} /> : undefined} />
          <SectionBody className={cn(av.filtros.pending && "pointer-events-none opacity-60", view === "grid" && "p-4")}>
            {view === "table" && <DataTable rows={filtradas} columns={cols.columnas} getRowId={(p) => p.id} selectable selected={seleccion} onSelectedChange={setSeleccion} onRowClick={(p) => abrir(p.id)} emptyState={vacio} />}
            {view === "grid" &&
              (filtradas.length === 0 ? (
                vacio
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {filtradas.map((p) => {
                    const Icono = ICONO_CANAL[p.canal]
                    return (
                      <div
                        key={p.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => abrir(p.id)}
                        onKeyDown={(e) => e.key === "Enter" && abrir(p.id)}
                        className="group flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <span className="flex items-start gap-2">
                          <span className="grid size-8 flex-none place-items-center rounded-lg bg-muted text-muted-foreground"><Icono className="size-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <span className="truncate">{p.nombre}</span>
                              {p.favorita && <StarIcon className="size-3.5 flex-none fill-current text-warning" aria-label="Favorita" />}
                            </span>
                            <span className="block text-xs text-muted-foreground">{USOS_PLANTILLA[p.uso]} · {CANALES_PLANTILLA[p.canal]}</span>
                          </span>
                          {menu(p)}
                        </span>
                        {p.asunto && <span className="truncate text-xs font-medium">{p.asunto}</span>}
                        <span className="line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">{p.cuerpo}</span>
                        <span className="mt-auto border-t pt-2 text-[11px] text-muted-foreground">Usada {p.usos} {p.usos === 1 ? "vez" : "veces"}{p.ultimoUso ? ` · la última el ${fmt.date(p.ultimoUso)}` : ""}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
          </SectionBody>
          <BulkBar count={seleccion.size} onClear={() => setSeleccion(new Set())}>
            <Button variant="ghost" size="sm" onClick={() => { favorita([...seleccion], true); setSeleccion(new Set()) }}><StarIcon /> Favoritas</Button>
            <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => eliminar([...seleccion])}><Trash2Icon /> Eliminar</Button>
          </BulkBar>
        </Section>
      </WorkGrid>
      <ConfirmDialog
        open={borrando !== null}
        onOpenChange={(o) => !o && setBorrando(null)}
        title={`¿Eliminar «${plantillas.find((p) => p.id === borrando?.[0])?.nombre ?? ""}»?`}
        description="Deja de salir al escribir a las marcas. Lo que ya mandaste no cambia."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (borrando) eliminar(borrando)
        }}
      />
    </PageBody>
  )
}
