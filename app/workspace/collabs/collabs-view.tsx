"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRightIcon, BanknoteIcon, CalendarClockIcon, HourglassIcon, PlusIcon, SparklesIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { filtrarFilas } from "@/lib/filtros/core"
import { COLLABS_ACTIVAS, ESTADOS_COLLAB, estadoDe, type Collab, type Contacto, type EstadoCollab, type FormularioMarca, type Marca, type Propuesta, type Tarea } from "@/lib/influencer/modelo"
import { marcaDe, siguienteHito } from "@/lib/influencer/collabs"
import { cifrasCollabs } from "@/lib/influencer/cifras-collabs"
import { camposCollab } from "@/lib/influencer/campos-collabs"
import { eventosDeCollabs, eventosDeTareas } from "@/lib/influencer/agenda"
import { guardarBorrador } from "@/lib/influencer/borradores"
import { usePageView } from "@/hooks/use-page-view"
import { useFiltrosAvanzados } from "@/hooks/use-filtros-avanzados"
import { useTableConfig } from "@/hooks/use-table-config"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageBody, PageHeader } from "@/components/app/page-header"
import { WorkGrid } from "@/components/app/work-grid"
import { FilterBar } from "@/components/app/filter-bar"
import type { FiltroRapido } from "@/components/app/quick-filters"
import { Section, SectionBody, SectionFooter, SectionHeader } from "@/components/app/section"
import { ColumnSettings } from "@/components/app/column-settings"
import { DataTable, TablePagination } from "@/components/app/data-table"
import { BulkBar } from "@/components/app/bulk-bar"
import { EmptyState } from "@/components/app/states"
import { StatRow, StatTile } from "@/components/influencer/stat-tile"
import { Agenda } from "@/components/influencer/agenda"
import { CompartirEnlaceDialog } from "@/components/influencer/compartir-enlace"
import { NuevaCollabDialog, type CollabCreada } from "./nueva-collab-dialog"
import { PanelCollabs } from "./panel-collabs"
import { ListaCollabs, TarjetasCollabs, columnasCollabs } from "./directorio-collabs"

const POR_PAGINA = 24

const RAPIDOS: FiltroRapido[] = [
  { id: "guardado:activas", clase: "guardado", label: "En marcha", union: "o", condiciones: COLLABS_ACTIVAS.map((e) => ({ campo: "estado", op: "es", valor: e })) },
  { id: "campo:marca", clase: "campo", campo: "marca" },
  { id: "campo:tipo", clase: "campo", campo: "tipo" },
  { id: "campo:cobro", clase: "campo", campo: "cobro" },
  { id: "guardado:esperando", clase: "guardado", label: "Esperando a la marca", union: "y", condiciones: [{ campo: "esperandoMarca", op: "verdadero" }] },
  { id: "guardado:cambios", clase: "guardado", label: "Con cambios pedidos", union: "y", condiciones: [{ campo: "cambiosPedidos", op: "verdadero" }] },
]

/** En marcha primero y, dentro, por lo que antes vence (las que ya lo entregaron todo, al final); después el historial, de la más nueva a la más vieja. */
const ordenar = (a: Collab, b: Collab) => {
  const activa = (c: Collab) => (COLLABS_ACTIVAS.includes(c.estado) ? 0 : 1)
  const vence = (c: Collab) => siguienteHito(c)?.fecha ?? "9999"
  return activa(a) - activa(b) || (activa(a) === 0 ? vence(a).localeCompare(vence(b)) : b.desde.localeCompare(a.desde))
}

type Props = { hoy: string; collabs: Collab[]; marcas: Marca[]; contactos: Contacto[]; tareas: Tarea[]; propuestas: Propuesta[]; formularios: FormularioMarca[]; nuevaInicial: boolean }

/**
 * Collabs: la portada con sus cifras, el directorio de colaboraciones (tarjetas, tabla, lista o
 * calendario) con filtros, y a la derecha las tareas de hoy y de los próximos días.
 */
export function CollabsView({ hoy, collabs: iniciales, marcas, contactos, tareas: tareasIniciales, propuestas, formularios: formulariosIniciales, nuevaInicial }: Props) {
  const router = useRouter()
  const [collabs, setCollabs] = React.useState(iniciales)
  const [tareas, setTareas] = React.useState(tareasIniciales)
  const [formularios, setFormularios] = React.useState(formulariosIniciales)
  const { view, setView, views } = usePageView("ws-collabs", ["grid", "table", "list", "calendar"])
  const campos = React.useMemo(() => camposCollab({ marcas, formularios }), [marcas, formularios])
  const av = useFiltrosAvanzados("ws-collabs", campos, RAPIDOS)
  const [q, setQ] = React.useState("")
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set())
  const [pagina, setPagina] = React.useState(1)
  const [nueva, setNueva] = React.useState(nuevaInicial)
  const [enlace, setEnlace] = React.useState<CollabCreada | null>(null)

  const filtradas = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    return filtrarFilas(collabs, av.grupo, campos)
      .filter((c) => !s || [c.campana, marcaDe(c, marcas).nombre].some((t) => t.toLowerCase().includes(s)))
      .sort(ordenar)
  }, [collabs, av.grupo, campos, q, marcas])

  const columnas = React.useMemo(() => columnasCollabs({ marcas, hoy, formularios }), [marcas, hoy, formularios])
  const cols = useTableConfig("ws-collabs", columnas)
  const cifras = cifrasCollabs(collabs, hoy)
  const enMarcha = filtradas.filter((c) => COLLABS_ACTIVAS.includes(c.estado))
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas)
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)
  const hayFiltro = q.trim() !== "" || av.hayCondiciones
  const eventos = React.useMemo(() => [...eventosDeCollabs(filtradas, marcas), ...eventosDeTareas(tareas, filtradas)], [filtradas, marcas, tareas])
  const abrir = (c: Collab) => router.push(`/workspace/collabs/${c.id}`)

  const cambiarEstado = (estado: EstadoCollab) => {
    const ids = [...seleccion]
    const previas = collabs
    setCollabs((cs) => cs.map((c) => (ids.includes(c.id) ? { ...c, estado } : c)))
    setSeleccion(new Set())
    toast.success(`${ids.length === 1 ? "Collab" : `${ids.length} collabs`}: ${estadoDe(ESTADOS_COLLAB, estado).label.toLowerCase()}`, { action: { label: "Deshacer", onClick: () => setCollabs(previas) } })
  }

  const creada = ({ collab, formulario }: CollabCreada) => {
    setCollabs((cs) => [collab, ...cs])
    if (!formulario) {
      toast.success("Collab creada: ahora revisa el brief y las piezas")
      router.push(`/workspace/collabs/${collab.id}`)
      return
    }
    setFormularios((fs) => [formulario, ...fs])
    // Solo en este repo: el formulario de la otra pestaña lee la collab recién creada del navegador.
    guardarBorrador(`formulario:${formulario.token}`, { registro: formulario, collab, marca: marcaDe(collab, marcas) })
    setEnlace({ collab, formulario })
  }

  const vacio = (
    <EmptyState
      icon={SparklesIcon}
      title={hayFiltro ? "Ninguna collab coincide" : "Aún no hay collabs"}
      description={hayFiltro ? "Prueba con otra búsqueda o quita algún filtro." : "Cuando ganes una propuesta aparece aquí. También puedes crear una a mano o pedirle el brief a la marca."}
      action={
        hayFiltro ? (
          <Button variant="outline" size="sm" onClick={() => { setQ(""); av.limpiar() }}>Quitar filtros</Button>
        ) : (
          <Button size="sm" onClick={() => setNueva(true)}><PlusIcon /> Nueva collab</Button>
        )
      }
    />
  )

  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <PageHeader title="Collabs" description="Tus colaboraciones de un vistazo: lo que está en marcha, lo que toca entregar y lo que falta por cobrar." />

      <WorkGrid
        stats={
          <StatRow>
            <StatTile icon={SparklesIcon} tint="lavender" label="En marcha" value={cifras.enMarcha} hint={`${cifras.piezasPorEntregar} piezas por entregar`} />
            <StatTile icon={CalendarClockIcon} tint="peach" label="Entregas esta semana" value={cifras.entregasSemana} hint={cifras.vencidas ? `${cifras.vencidas} ${cifras.vencidas === 1 ? "vencida" : "vencidas"}` : "Al día"} />
            <StatTile icon={HourglassIcon} tint="sky" label="Esperando a la marca" value={cifras.esperando} hint={cifras.esperando ? `La que más, ${cifras.esperaMasLarga} ${cifras.esperaMasLarga === 1 ? "día" : "días"}` : "Nada pendiente"} />
            <StatTile icon={BanknoteIcon} tint="mint" label="Por cobrar" value={fmt.eur(cifras.porCobrar)} hint={cifras.vencido ? `${fmt.eur(cifras.vencido)} vencido` : "Nada vencido"} />
          </StatRow>
        }
        toolbar={
          <FilterBar
            filtros={av}
            campos={campos}
            filas={filtradas}
            objeto="las collabs"
            buscador={{ value: q, onChange: setQ, placeholder: "Buscar marca o campaña…" }}
            vistas={{ views, value: view, onChange: setView }}
            onLimpiar={() => setQ("")}
            actions={<Button onClick={() => setNueva(true)}><PlusIcon /> Nueva collab</Button>}
          />
        }
        aside={<PanelCollabs hoy={hoy} tareas={tareas} setTareas={setTareas} collabs={collabs} propuestas={propuestas} marcas={marcas} />}
        asideWidth={340}
      >
        <Section className="min-h-[560px]">
          <SectionHeader icon={SparklesIcon} title="Directorio" count={filtradas.length} meta={`${enMarcha.length} en marcha · ${fmt.eur(enMarcha.reduce((a, c) => a + (c.importeNeto ?? c.importe), 0))}`} action={view === "table" ? <ColumnSettings config={cols} /> : undefined} />
          <SectionBody className={cn(av.filtros.pending && "pointer-events-none opacity-60", view === "calendar" && "p-4")}>
            {filtradas.length === 0 && view !== "calendar" ? (
              vacio
            ) : view === "grid" ? (
              <TarjetasCollabs collabs={visibles} marcas={marcas} formularios={formularios} />
            ) : view === "table" ? (
              <DataTable rows={visibles} columns={cols.columnas} getRowId={(c) => c.id} selectable selected={seleccion} onSelectedChange={setSeleccion} onRowClick={abrir} emptyState={vacio} />
            ) : view === "list" ? (
              <ListaCollabs collabs={visibles} marcas={marcas} formularios={formularios} hoy={hoy} seleccion={seleccion} onAbrir={abrir} />
            ) : (
              <Agenda eventos={eventos} hoy={hoy} />
            )}
          </SectionBody>
          {view !== "calendar" && filtradas.length > POR_PAGINA && (
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
                {ESTADOS_COLLAB.map((e) => (
                  <DropdownMenuItem key={e.id} onSelect={() => cambiarEstado(e.id)}>{e.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </BulkBar>
        </Section>
      </WorkGrid>

      <NuevaCollabDialog open={nueva} onOpenChange={setNueva} marcas={marcas} contactos={contactos} hoy={hoy} onCreate={creada} />
      {enlace?.formulario && (
        <CompartirEnlaceDialog
          open
          onOpenChange={(o) => !o && setEnlace(null)}
          titulo={enlace.formulario.alcance === "brief" ? "Formulario listo para la marca" : "Enlace para subir materiales"}
          descripcion={`Mándaselo a ${enlace.formulario.para.nombre}: lo rellena sin cuenta y te llega a la collab «${enlace.collab.campana}». Caduca el ${fmt.date(enlace.formulario.caduca)}.`}
          ruta={`/formulario/${enlace.formulario.token}`}
          mensaje={enlace.formulario.mensaje ?? "Aquí puedes contarme la campaña:"}
          asunto={`${enlace.collab.campana} · brief para ${marcaDe(enlace.collab, marcas).nombre}`}
          email={enlace.formulario.para.email}
          verComo="Ver el formulario"
        />
      )}
    </PageBody>
  )
}
