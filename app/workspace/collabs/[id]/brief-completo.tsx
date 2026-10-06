"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CopyIcon, DownloadIcon, ExternalLinkIcon, FileArchiveIcon, FileIcon, FileTextIcon, FileVideoIcon, ImageIcon, LinkIcon, PackageSearchIcon, type LucideIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { ESTADOS_PRODUCTO, TIPOS_COLLAB, estadoDe, type Brief, type EstadoProducto, type TipoCollab, type TipoMaterial } from "@/lib/influencer/modelo"
import { describirEntregables } from "@/lib/influencer/collabs"
import { partirEtiquetas } from "@/lib/influencer/formularios"
import { importeNeto } from "@/lib/influencer/presupuesto"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/app/status-badge"
import { DetailField, DetailFields } from "@/components/app/detail-sheet"
import { InlineField, type ValorInline } from "@/components/app/inline-field"
import { EditorTexto } from "@/components/influencer/editor-texto"
import { useCollab } from "./collab-provider"
import { PedirFormularioDialog } from "./pedir-formulario-dialog"

const ICONOS: Record<TipoMaterial, LucideIcon> = { imagen: ImageIcon, video: FileVideoIcon, pdf: FileTextIcon, documento: FileIcon, enlace: LinkIcon, zip: FileArchiveIcon }

const PLANTILLA_BRIEF = "<h3>Objetivo</h3><p></p><h3>Mensajes clave</h3><ul><li><p></p></li></ul><h3>Claims permitidos</h3><ul><li><p></p></li></ul><h3>Claims prohibidos</h3><ul><li><p></p></li></ul><h3>Hay que</h3><ul><li><p></p></li></ul><h3>Evitar</h3><ul><li><p></p></li></ul>"

async function copiar(texto: string, aviso: string) {
  await navigator.clipboard.writeText(texto)
  toast.success(aviso)
}

/** Etiquetas (menciones, hashtags) que se copian todas de un clic para pegarlas al publicar. */
function Etiquetas({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {items.map((i) => (
        <span key={i} className="rounded-md bg-muted px-1.5 py-px text-xs font-medium">
          {i}
        </span>
      ))}
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Copiar" onClick={(e) => { e.stopPropagation(); void copiar(items.join(" "), "Copiado") }}>
        <CopyIcon />
      </Button>
    </span>
  )
}

/**
 * El brief entero, para leerlo y retocarlo: a la izquierda los datos que se usan sueltos (importe,
 * fechas, rondas, derechos, menciones…), en el centro el texto del brief y a la derecha los
 * materiales de la marca con su descarga. Todo se edita donde se lee.
 */
export function BriefCompleto() {
  const { collab, setCollab, materiales } = useCollab()
  const [pedir, setPedir] = React.useState(false)
  const { brief } = collab
  const deLaMarca = materiales[0].filter((m) => m.origen === "marca")

  const guardarBrief = <K extends keyof Brief>(campo: K, valor: Brief[K]) => setCollab((c) => ({ ...c, brief: { ...c.brief, [campo]: valor } }))
  const texto = (campo: "exclusividad" | "derechosUso" | "enlace" | "codigo") => async (v: ValorInline) => guardarBrief(campo, v ? String(v) : undefined)

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <h3 className="mb-2 text-[13px] font-semibold">Datos clave</h3>
        <DetailFields>
          <DetailField key="importe" label="Importe">
            <InlineField value={collab.importe} tipo="numero" onSave={async (v) => setCollab((c) => ({ ...c, importe: Number(v) || 0, importeNeto: c.tipo === "red" ? importeNeto(Number(v) || 0) : undefined }))} render={(v) => <span className="font-semibold tabular-nums">{fmt.eur(Number(v))}{collab.importeNeto && <span className="font-normal text-muted-foreground"> · {fmt.eur(collab.importeNeto)} para ti</span>}</span>} />
          </DetailField>
          <DetailField key="tipo" label="Tipo">
            <InlineField value={collab.tipo} tipo="select" required opciones={(Object.keys(TIPOS_COLLAB) as TipoCollab[]).map((t) => ({ value: t, label: TIPOS_COLLAB[t].label }))} onSave={async (v) => setCollab((c) => ({ ...c, tipo: (Object.keys(TIPOS_COLLAB) as TipoCollab[]).find((t) => t === v) ?? c.tipo }))} render={(v) => TIPOS_COLLAB[(v as TipoCollab) ?? "directa"]?.label} />
          </DetailField>
          <DetailField key="desde" label="Publicar desde">
            <InlineField value={collab.desde} tipo="fecha" onSave={async (v) => setCollab((c) => ({ ...c, desde: String(v ?? c.desde) }))} render={(v) => fmt.dateLong(String(v))} />
          </DetailField>
          <DetailField key="hasta" label="Publicar hasta">
            <InlineField value={collab.hasta} tipo="fecha" onSave={async (v) => setCollab((c) => ({ ...c, hasta: String(v ?? c.hasta) }))} render={(v) => fmt.dateLong(String(v))} />
          </DetailField>
          <DetailField key="entregables" label="Entregables">
            <InlineField value={describirEntregables(collab)} readOnly onSave={async () => undefined} />
          </DetailField>
          <DetailField key="rondas" label="Rondas">
            <InlineField value={brief.rondasIncluidas} tipo="numero" onSave={async (v) => guardarBrief("rondasIncluidas", Number(v) || 0)} render={(v) => `${v} por pieza`} />
          </DetailField>
          <DetailField key="exclusividad" label="Exclusividad" empty={!brief.exclusividad}>
            <InlineField value={brief.exclusividad ?? null} tipo="texto" placeholder="Categoría · meses" onSave={texto("exclusividad")} />
          </DetailField>
          <DetailField key="derechos" label="Derechos de uso" empty={!brief.derechosUso}>
            <InlineField value={brief.derechosUso ?? null} tipo="texto" placeholder="Orgánico · 6 meses" onSave={texto("derechosUso")} />
          </DetailField>
          <DetailField key="pago" label="Pago" empty={!brief.condicionesPago}>
            <InlineField value={brief.condicionesPago} tipo="textarea" multiline={2} placeholder="30 días tras publicar" onSave={async (v) => guardarBrief("condicionesPago", String(v ?? ""))} />
          </DetailField>
          <DetailField key="producto" label="Producto" empty={!brief.producto}>
            <InlineField
              value={brief.producto?.estado ?? null}
              tipo="select"
              opciones={ESTADOS_PRODUCTO.map((e) => ({ value: e.id, label: e.label }))}
              onSave={async (v) => guardarBrief("producto", v ? { estado: ESTADOS_PRODUCTO.find((e) => e.id === v)?.id ?? "pendiente", detalle: brief.producto?.detalle } : undefined)}
              render={(v) => (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <StatusBadge tone={estadoDe(ESTADOS_PRODUCTO, v as EstadoProducto).tone}>{estadoDe(ESTADOS_PRODUCTO, v as EstadoProducto).label}</StatusBadge>
                  {brief.producto?.detalle && <span className="text-xs text-muted-foreground">{brief.producto.detalle}</span>}
                </span>
              )}
            />
          </DetailField>
          <DetailField key="contacto" label="Contacto" empty={!brief.contacto.nombre}>
            <InlineField value={brief.contacto.nombre} tipo="texto" placeholder="Nombre" onSave={async (v) => guardarBrief("contacto", { ...brief.contacto, nombre: String(v ?? "") })} />
          </DetailField>
          <DetailField key="email" label="Email" empty={!brief.contacto.email}>
            <InlineField value={brief.contacto.email} tipo="email" placeholder="nombre@marca.com" onSave={async (v) => guardarBrief("contacto", { ...brief.contacto, email: String(v ?? "") })} />
          </DetailField>
          <DetailField key="menciones" label="Menciones" empty={brief.menciones.length === 0}>
            <InlineField value={brief.menciones.join(" ")} tipo="texto" placeholder="@marca" onSave={async (v) => guardarBrief("menciones", partirEtiquetas(String(v ?? "")))} render={() => <Etiquetas items={brief.menciones} />} />
          </DetailField>
          <DetailField key="hashtags" label="Hashtags" empty={brief.hashtags.length === 0}>
            <InlineField value={brief.hashtags.join(" ")} tipo="texto" placeholder="#publi #campaña" onSave={async (v) => guardarBrief("hashtags", partirEtiquetas(String(v ?? "")))} render={() => <Etiquetas items={brief.hashtags} />} />
          </DetailField>
          <DetailField key="enlace" label="Enlace" empty={!brief.enlace}>
            <InlineField value={brief.enlace ?? null} tipo="url" placeholder="https://" onSave={texto("enlace")} />
          </DetailField>
          <DetailField key="codigo" label="Código" empty={!brief.codigo}>
            <InlineField value={brief.codigo ?? null} tipo="texto" placeholder="MARTA15" onSave={texto("codigo")} render={(v) => <Etiquetas items={[String(v)]} />} />
          </DetailField>
        </DetailFields>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-[13px] font-semibold">Brief</h3>
          <span className="text-xs text-muted-foreground">Objetivo, mensajes, claims y lo que sí y lo que no, en un solo texto. Se guarda solo.</span>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <EditorTexto value={brief.texto || PLANTILLA_BRIEF} onChange={(html) => guardarBrief("texto", html)} placeholder="Escribe o pega aquí el brief de la marca…" contenidoClassName="min-h-[360px] px-5 py-4" />
        </div>
      </div>

      <div className="min-w-0 lg:col-span-2 2xl:col-span-1">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-[13px] font-semibold">Materiales de la marca</h3>
          <span className="text-xs text-muted-foreground tabular-nums">{deLaMarca.length}</span>
          <Link href={`/workspace/collabs/${collab.id}/materiales`} className="ml-auto text-xs font-medium text-brand hover:underline">
            Todos
          </Link>
        </div>
        {deLaMarca.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center">
            <PackageSearchIcon className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-1.5 text-xs text-muted-foreground">La marca aún no ha mandado logos, fotos ni guías.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {deLaMarca.map((m) => {
              const Icono = ICONOS[m.tipo]
              return (
                <li key={m.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
                  <Icono className="size-4 flex-none text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{m.nombre}</span>
                    {m.tamano && <span className="block text-[11px] text-muted-foreground">{fmt.bytes(m.tamano)}</span>}
                  </span>
                  <Button variant="ghost" size="icon-xs" asChild aria-label={m.tipo === "enlace" ? `Abrir ${m.nombre}` : `Descargar ${m.nombre}`}>
                    <a href={m.url} target="_blank" rel="noreferrer" download={m.tipo === "enlace" ? undefined : m.nombre}>
                      {m.tipo === "enlace" ? <ExternalLinkIcon /> : <DownloadIcon />}
                    </a>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPedir(true)}>
          Pedir materiales a la marca
        </Button>
      </div>
      <PedirFormularioDialog open={pedir} onOpenChange={setPedir} alcance="materiales" />
    </div>
  )
}
