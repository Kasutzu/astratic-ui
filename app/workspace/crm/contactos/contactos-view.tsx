"use client"

import * as React from "react"
import { toast } from "sonner"
import { AtSignIcon, CopyIcon, DownloadIcon, MessagesSquareIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { filtrarFilas } from "@/lib/filtros/core"
import { TIPOS_INTERACCION, type Contacto } from "@/lib/influencer/modelo"
import { camposContacto } from "@/lib/influencer/campos"
import { ultimoContactoDe } from "@/lib/influencer/crm"
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
import { InsightList, InsightStat, InsightsPanel } from "@/components/app/insights-panel"
import { AvatarInitials } from "@/components/app/avatar-initials"
import { BrandMark } from "@/components/influencer/brand-mark"
import { useCrm } from "../crm-provider"
import { CrmHeader } from "../crm-header"
import { useRegistroAbierto } from "../use-registro"
import { descargarCsv } from "../exportar"
import { ContactoDialog } from "./contacto-dialog"
import { ContactoSheet } from "./contacto-sheet"

const POR_PAGINA = 25

const RAPIDOS: FiltroRapido[] = [
  { id: "campo:marca", clase: "campo", campo: "marca" },
  { id: "guardado:con-email", clase: "guardado", label: "Con email", union: "y", condiciones: [{ campo: "email", op: "no_vacio" }] },
  { id: "guardado:sin-email", clase: "guardado", label: "Sin email", union: "y", condiciones: [{ campo: "email", op: "vacio" }] },
  { id: "guardado:principales", clase: "guardado", label: "Principales", union: "y", condiciones: [{ campo: "principal", op: "verdadero" }] },
]

/** La base de contactos: las personas de cada marca, con cómo escribirles y cuándo se habló por última vez. */
export function ContactosView({ abiertaInicial, nuevaInicial }: { abiertaInicial: string | null; nuevaInicial: boolean }) {
  const { contactos, setContactos, marcas, interacciones } = useCrm()
  const { view, setView, views } = usePageView("ws-contactos", ["table", "list"])
  const campos = React.useMemo(() => camposContacto({ marcas, interacciones }), [marcas, interacciones])
  const av = useFiltrosAvanzados("ws-contactos", campos, RAPIDOS)
  const [q, setQ] = React.useState("")
  const [seleccion, setSeleccion] = React.useState<Set<string>>(new Set())
  const [pagina, setPagina] = React.useState(1)
  const [abiertoId, abrir] = useRegistroAbierto(abiertaInicial)
  const [nuevo, setNuevo] = React.useState(nuevaInicial)

  const marcaDe = (c: Contacto) => marcas.find((m) => m.id === c.marcaId)
  const ultimo = (c: Contacto) => ultimoContactoDe(c.id, interacciones)

  const filtrados = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    return filtrarFilas(contactos, av.grupo, campos)
      .filter((c) => !s || [c.nombre, c.cargo ?? "", c.email ?? "", marcas.find((m) => m.id === c.marcaId)?.nombre ?? ""].some((t) => t.toLowerCase().includes(s)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  }, [contactos, av.grupo, campos, q, marcas])

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)
  const hayFiltro = q.trim() !== "" || av.hayCondiciones

  const copiarEmail = async (email: string) => {
    await navigator.clipboard.writeText(email)
    toast.success("Email copiado")
  }

  const columnas = React.useMemo<Column<Contacto>[]>(
    () => [
      { id: "nombre", header: "Contacto", minWidth: 220, sortValue: (c) => c.nombre, cell: (c) => <CellPrimary leading={<AvatarInitials name={c.nombre} size="md" />} title={c.nombre} subtitle={c.cargo ?? "Sin cargo"} /> },
      {
        id: "marca",
        header: "Marca",
        sortValue: (c) => marcas.find((m) => m.id === c.marcaId)?.nombre ?? "",
        cell: (c) => {
          const m = marcas.find((x) => x.id === c.marcaId)
          return m ? <span className="inline-flex items-center gap-2"><BrandMark name={m.nombre} tint={m.tint} size="xs" />{m.nombre}{c.principal && <StatusBadge tone="info">Principal</StatusBadge>}</span> : "—"
        },
      },
      {
        id: "email",
        header: "Email",
        sortValue: (c) => c.email ?? "",
        cell: (c) =>
          c.email ? (
            <button type="button" title="Copiar el email" className="max-w-full truncate rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50" onClick={(e) => { e.stopPropagation(); void copiarEmail(c.email ?? "") }}>
              {c.email}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-warning"><AtSignIcon className="size-3" /> Sin email</span>
          ),
      },
      { id: "telefono", header: "Teléfono", hideBelow: "xl", cell: (c) => <span className="tabular-nums text-muted-foreground">{c.telefono ?? "—"}</span> },
      { id: "instagram", header: "Instagram", hideBelow: "2xl", cell: (c) => <span className="text-muted-foreground">{c.instagram ? `@${c.instagram}` : "—"}</span> },
      { id: "ultimo", header: "Último contacto", align: "right", hideBelow: "lg", sortValue: (c) => ultimoContactoDe(c.id, interacciones) ?? "", cell: (c) => <span className="text-xs text-muted-foreground">{ultimoContactoDe(c.id, interacciones) ? fmt.date(ultimoContactoDe(c.id, interacciones) ?? "") : "—"}</span> },
      { id: "creado", header: "Añadido", align: "right", hideBelow: "2xl", sortValue: (c) => c.creadoEl, cell: (c) => <span className="text-xs text-muted-foreground">{fmt.date(c.creadoEl)}</span> },
    ],
    [marcas, interacciones],
  )
  const cols = useTableConfig("ws-contactos", columnas)

  const exportar = (lista: Contacto[]) =>
    descargarCsv(
      "contactos",
      ["Nombre", "Cargo", "Marca", "Email", "Teléfono", "Instagram", "Principal", "Último contacto"],
      lista.map((c) => [c.nombre, c.cargo, marcaDe(c)?.nombre, c.email, c.telefono, c.instagram ? `@${c.instagram}` : "", c.principal ? "Sí" : "No", ultimo(c)?.slice(0, 10)]),
    )

  const eliminar = (ids: string[]) => {
    const antes = contactos
    setContactos((cs) => cs.filter((c) => !ids.includes(c.id)))
    setSeleccion(new Set())
    abrir(null)
    toast.success(ids.length === 1 ? "Contacto eliminado" : `${ids.length} contactos eliminados`, { action: { label: "Deshacer", onClick: () => setContactos(antes) } })
  }

  const vacio = (
    <EmptyState
      icon={UsersIcon}
      title={hayFiltro ? "Ningún contacto coincide" : "Aún no tienes contactos"}
      description={hayFiltro ? "Prueba con otra búsqueda o quita algún filtro." : "Añade a la gente de cada marca: quién lleva las colaboraciones y cómo escribirle."}
      action={hayFiltro ? <Button variant="outline" size="sm" onClick={() => { setQ(""); av.limpiar() }}>Quitar filtros</Button> : <Button size="sm" onClick={() => setNuevo(true)}><PlusIcon /> Nuevo contacto</Button>}
    />
  )

  const conEmail = contactos.filter((c) => c.email).length
  const otraVia = contactos.filter((c) => !c.email && (c.telefono || c.instagram)).length
  const recientes = [...interacciones].filter((i) => i.contactoId).sort((a, b) => b.el.localeCompare(a.el)).slice(0, 5)

  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <CrmHeader
        description="La gente de cada marca: quién lleva las colaboraciones, cómo escribirle y cuándo hablasteis."
        actions={<Button variant="outline" onClick={() => exportar(filtrados)} disabled={!filtrados.length}><DownloadIcon /> Exportar</Button>}
      />
      <WorkGrid
        toolbar={
          <FilterBar
            filtros={av}
            campos={campos}
            filas={filtrados}
            objeto="los contactos"
            buscador={{ value: q, onChange: setQ, placeholder: "Buscar nombre, email o marca…" }}
            vistas={{ views, value: view, onChange: setView }}
            onLimpiar={() => setQ("")}
            actions={<Button onClick={() => setNuevo(true)}><PlusIcon /> Nuevo contacto</Button>}
          />
        }
        aside={
          <InsightsPanel
            storageKey="ws-contactos"
            blocks={[
              {
                id: "via",
                title: "Cómo escribirles",
                icon: AtSignIcon,
                render: () => (
                  <div className="divide-y">
                    <InsightStat label="Con email" value={conEmail} />
                    <InsightStat label="Solo teléfono o Instagram" value={otraVia} />
                    <InsightStat label="Sin forma de contacto" value={contactos.length - conEmail - otraVia} />
                  </div>
                ),
              },
              {
                id: "recientes",
                title: "Últimas conversaciones",
                icon: MessagesSquareIcon,
                render: () =>
                  recientes.length ? (
                    <InsightList
                      items={recientes.map((i) => {
                        const c = contactos.find((x) => x.id === i.contactoId)
                        return { key: i.id, title: c ? <button type="button" className="text-left hover:underline" onClick={() => abrir(c.id)}>{c.nombre}</button> : "—", subtitle: `${TIPOS_INTERACCION[i.tipo]} ${i.sentido === "enviado" ? "enviado" : "recibido"}`, trailing: <span className="text-muted-foreground">{fmt.date(i.el)}</span> }
                      })}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">Apunta en el seguimiento cada email o mensaje y aquí verás con quién hablaste.</p>
                  ),
              },
            ]}
          />
        }
      >
        <Section className="min-h-[560px]">
          <SectionHeader icon={UsersIcon} title="Contactos" count={filtrados.length} action={view === "table" ? <ColumnSettings config={cols} /> : undefined} />
          <SectionBody className={cn(av.filtros.pending && "pointer-events-none opacity-60")}>
            {view === "table" && <DataTable rows={visibles} columns={cols.columnas} getRowId={(c) => c.id} selectable selected={seleccion} onSelectedChange={setSeleccion} onRowClick={(c) => abrir(c.id)} activeId={abiertoId} emptyState={vacio} />}
            {view === "list" &&
              (filtrados.length === 0 ? (
                vacio
              ) : (
                <RecordList>
                  {visibles.map((c) => (
                    <RecordListItem
                      key={c.id}
                      leading={<AvatarInitials name={c.nombre} />}
                      title={c.nombre}
                      subtitle={[c.cargo, marcaDe(c)?.nombre].filter(Boolean).join(" · ")}
                      status={c.email ? undefined : <StatusBadge tone="warning">Sin email</StatusBadge>}
                      value={ultimo(c) ? fmt.date(ultimo(c) ?? "") : undefined}
                      selected={seleccion.has(c.id) || c.id === abiertoId}
                      onClick={() => abrir(c.id)}
                    />
                  ))}
                </RecordList>
              ))}
          </SectionBody>
          {filtrados.length > 0 && (
            <SectionFooter>
              <TablePagination page={paginaActual} pageCount={paginas} onPageChange={setPagina} total={filtrados.length} pageSize={POR_PAGINA} />
            </SectionFooter>
          )}
          <BulkBar count={seleccion.size} onClear={() => setSeleccion(new Set())}>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const emails = contactos.filter((c) => seleccion.has(c.id) && c.email).map((c) => c.email)
                await navigator.clipboard.writeText(emails.join(", "))
                toast.success(emails.length === 1 ? "Email copiado" : `${emails.length} emails copiados`)
              }}
            >
              <CopyIcon /> Copiar emails
            </Button>
            <Button variant="ghost" size="sm" onClick={() => exportar(contactos.filter((c) => seleccion.has(c.id)))}><DownloadIcon /> Exportar</Button>
            <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => eliminar([...seleccion])}><Trash2Icon /> Eliminar</Button>
          </BulkBar>
        </Section>
      </WorkGrid>

      <ContactoSheet lista={filtrados} abiertoId={abiertoId} abrir={abrir} onBorrar={(id) => eliminar([id])} />
      <ContactoDialog open={nuevo} onOpenChange={setNuevo} onCreado={(c) => { abrir(c.id); toast.success(`${c.nombre} añadido`) }} />
    </PageBody>
  )
}
