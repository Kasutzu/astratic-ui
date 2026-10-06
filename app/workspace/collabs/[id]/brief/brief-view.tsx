"use client"

import * as React from "react"
import Link from "next/link"
import { FileIcon, ImageIcon, LinkIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { ESTADOS_PRODUCTO, TIPOS_COLLAB, estadoDe, type Brief, type Collab, type EstadoProducto, type Material, type TipoCollab } from "@/lib/influencer/modelo"
import { importeNeto } from "@/lib/influencer/presupuesto"
import { StatusBadge } from "@/components/app/status-badge"
import { DetailField, DetailFields } from "@/components/app/detail-sheet"
import { InlineField, type ValorInline } from "@/components/app/inline-field"
import { Block, BlockHeader } from "@/components/influencer/block"

const aLineas = (v: ValorInline) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

const aChips = (v: ValorInline) =>
  String(v ?? "")
    .split(/[,\s]+/)
    .map((l) => l.trim())
    .filter(Boolean)

function Lista({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-4">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  )
}

function Chips({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((i) => (
        <span key={i} className="rounded-md bg-muted px-1.5 py-px text-xs font-medium">
          {i}
        </span>
      ))}
    </span>
  )
}

/** El brief completo, editable donde se lee: lo que hay que cumplir, las condiciones y los archivos de la marca. */
export function BriefView({ collab: inicial, materiales }: { collab: Collab; materiales: Material[] }) {
  const [collab, setCollab] = React.useState(inicial)
  const { brief } = collab

  const guardarBrief = (campo: keyof Brief, transformar: (v: ValorInline) => Brief[keyof Brief] = (v) => (v === "" ? undefined : (v as Brief[keyof Brief]))) => async (v: ValorInline) => {
    setCollab((c) => ({ ...c, brief: { ...c.brief, [campo]: transformar(v) } }))
  }
  const guardarCollab = (campo: keyof Collab) => async (v: ValorInline) => {
    setCollab((c) => ({ ...c, [campo]: v, ...(campo === "importe" && c.tipo === "red" ? { importeNeto: importeNeto(Number(v)) } : {}) }))
  }

  const lineas = (campo: "mensajesClave" | "claimsPermitidos" | "claimsProhibidos" | "hacer" | "evitar", label: string, placeholder: string) => (
    <DetailField key={campo} label={label} empty={brief[campo].length === 0}>
      <InlineField value={brief[campo].join("\n")} tipo="textarea" multiline={3} placeholder={placeholder} onSave={guardarBrief(campo, aLineas)} render={() => <Lista items={brief[campo]} />} />
    </DetailField>
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_372px]">
      <Block className="p-0">
        <BlockHeader title="Lo que hay que cumplir" className="px-5 pt-5" />
        <DetailFields>
          <DetailField key="objetivo" label="Objetivo" empty={!brief.objetivo}>
            <InlineField value={brief.objetivo} tipo="textarea" multiline={3} placeholder="Qué quiere conseguir la marca" onSave={guardarBrief("objetivo", (v) => String(v ?? ""))} />
          </DetailField>
          {lineas("mensajesClave", "Mensajes clave", "Uno por línea")}
          <DetailField key="menciones" label="Menciones" empty={brief.menciones.length === 0}>
            <InlineField value={brief.menciones.join(" ")} tipo="texto" placeholder="@marca @otra" onSave={guardarBrief("menciones", aChips)} render={() => <Chips items={brief.menciones} />} />
          </DetailField>
          <DetailField key="hashtags" label="Hashtags" empty={brief.hashtags.length === 0}>
            <InlineField value={brief.hashtags.join(" ")} tipo="texto" placeholder="#publi #campaña" onSave={guardarBrief("hashtags", aChips)} render={() => <Chips items={brief.hashtags} />} />
          </DetailField>
          <DetailField key="enlace" label="Enlace" empty={!brief.enlace}>
            <InlineField value={brief.enlace ?? null} tipo="url" placeholder="https://" onSave={guardarBrief("enlace")} />
          </DetailField>
          <DetailField key="codigo" label="Código de descuento" empty={!brief.codigo}>
            <InlineField value={brief.codigo ?? null} tipo="texto" placeholder="MARTA15" onSave={guardarBrief("codigo")} render={(v) => <span className="rounded-md border px-1.5 py-px font-mono text-xs">{String(v)}</span>} />
          </DetailField>
          {lineas("claimsPermitidos", "Claims permitidos", "Lo que sí se puede decir, uno por línea")}
          {lineas("claimsProhibidos", "Claims prohibidos", "Lo que no se puede decir, uno por línea")}
          {lineas("hacer", "Hay que", "Uno por línea")}
          {lineas("evitar", "Evitar", "Uno por línea")}
          <DetailField key="producto" label="Producto" empty={!brief.producto}>
            <InlineField
              value={brief.producto?.estado ?? null}
              tipo="select"
              opciones={ESTADOS_PRODUCTO.map((e) => ({ value: e.id, label: e.label }))}
              onSave={async (v) => setCollab((c) => ({ ...c, brief: { ...c.brief, producto: v ? { estado: v as EstadoProducto, detalle: c.brief.producto?.detalle } : undefined } }))}
              render={(v) => (
                <span className="inline-flex items-center gap-2">
                  <StatusBadge tone={estadoDe(ESTADOS_PRODUCTO, v as EstadoProducto).tone}>{estadoDe(ESTADOS_PRODUCTO, v as EstadoProducto).label}</StatusBadge>
                  {brief.producto?.detalle && <span className="text-muted-foreground">{brief.producto.detalle}</span>}
                </span>
              )}
            />
          </DetailField>
        </DetailFields>
      </Block>

      <div className="flex min-w-0 flex-col gap-6">
        <Block className="p-0">
          <BlockHeader title="Condiciones" className="px-5 pt-5" />
          <DetailFields>
            <DetailField key="tipo" label="Tipo">
              <InlineField value={collab.tipo} tipo="select" required opciones={(Object.keys(TIPOS_COLLAB) as TipoCollab[]).map((t) => ({ value: t, label: TIPOS_COLLAB[t].label }))} onSave={guardarCollab("tipo")} render={(v) => TIPOS_COLLAB[v as TipoCollab].label} />
            </DetailField>
            <DetailField key="importe" label="Importe">
              <InlineField value={collab.importe} tipo="numero" onSave={guardarCollab("importe")} render={(v) => <span className="tabular-nums"><span className="font-semibold">{fmt.eur(Number(v))}</span>{collab.importeNeto && <span className="text-muted-foreground"> · {fmt.eur(collab.importeNeto)} para ti</span>}</span>} />
            </DetailField>
            <DetailField key="desde" label="Publicar desde">
              <InlineField value={collab.desde} tipo="fecha" required onSave={guardarCollab("desde")} render={(v) => fmt.dateLong(String(v))} />
            </DetailField>
            <DetailField key="hasta" label="Publicar hasta">
              <InlineField value={collab.hasta} tipo="fecha" required onSave={guardarCollab("hasta")} render={(v) => fmt.dateLong(String(v))} />
            </DetailField>
            <DetailField key="pago" label="Pago" empty={!brief.condicionesPago}>
              <InlineField value={brief.condicionesPago} tipo="textarea" multiline={2} placeholder="30 días tras publicar" onSave={guardarBrief("condicionesPago", (v) => String(v ?? ""))} />
            </DetailField>
            <DetailField key="rondas" label="Rondas incluidas">
              <InlineField value={brief.rondasIncluidas} tipo="numero" onSave={guardarBrief("rondasIncluidas", (v) => Number(v) || 0)} render={(v) => `${v} por pieza`} />
            </DetailField>
            <DetailField key="exclusividad" label="Exclusividad" empty={!brief.exclusividad}>
              <InlineField value={brief.exclusividad ?? null} tipo="texto" placeholder="Categoría · meses" onSave={guardarBrief("exclusividad")} />
            </DetailField>
            <DetailField key="derechos" label="Derechos de uso" empty={!brief.derechosUso}>
              <InlineField value={brief.derechosUso ?? null} tipo="texto" placeholder="Orgánico · 6 meses" onSave={guardarBrief("derechosUso")} />
            </DetailField>
            <DetailField key="contacto" label="Contacto" empty={!brief.contacto.nombre}>
              <InlineField value={brief.contacto.nombre} tipo="texto" placeholder="Nombre" onSave={async (v) => setCollab((c) => ({ ...c, brief: { ...c.brief, contacto: { ...c.brief.contacto, nombre: String(v ?? "") } } }))} />
            </DetailField>
            <DetailField key="email" label="Email" empty={!brief.contacto.email}>
              <InlineField value={brief.contacto.email} tipo="email" placeholder="nombre@marca.com" onSave={async (v) => setCollab((c) => ({ ...c, brief: { ...c.brief, contacto: { ...c.brief.contacto, email: String(v ?? "") } } }))} />
            </DetailField>
          </DetailFields>
        </Block>

        <Block>
          <BlockHeader title="Archivos de la marca" count={materiales.length} href={`/workspace/collabs/${collab.id}/materiales`} hrefLabel="Materiales" />
          {materiales.length === 0 ? (
            <p className="text-sm text-muted-foreground">La marca no ha mandado archivos. Súbelos en Materiales cuando lleguen.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {materiales.map((m) => {
                const Icono = m.tipo === "imagen" ? ImageIcon : m.tipo === "enlace" ? LinkIcon : FileIcon
                return (
                  <li key={m.id}>
                    <Link href={m.url} target={m.tipo === "enlace" ? "_blank" : undefined} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                      <Icono className="size-4 flex-none text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{m.nombre}</span>
                      {m.tamano && <span className="text-xs text-muted-foreground">{fmt.bytes(m.tamano)}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Block>
      </div>
    </div>
  )
}
