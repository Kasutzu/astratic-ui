"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { BanknoteIcon, CheckIcon, CopyIcon, DownloadIcon, EllipsisIcon, FileTextIcon, MailIcon, PlusIcon, ReceiptTextIcon, SendIcon, Trash2Icon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_FACTURA, estadoDe, type DatosFacturacion, type DatosFiscales, type Factura, type PlazoCobro } from "@/lib/influencer/modelo"
import { calcularFactura, cobroDeFacturas, datosParaCopiar, emailDeReclamacion, estadoDeFactura, importeDePlazo, resumenFacturacion, siguientePlazo } from "@/lib/influencer/facturacion"
import { idNuevo } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Section, SectionBody, SectionFooter, SectionHeader } from "@/components/app/section"
import { DataTable, type Column } from "@/components/app/data-table"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { InlineField } from "@/components/app/inline-field"
import { useCollab } from "../collab-provider"
import { FacturaDialog } from "./factura-dialog"
import { DatosFacturar } from "./datos-facturar"

/**
 * La facturación de la collab: lo pactado frente a lo facturado y cobrado, el plan de cobro por
 * plazos (cada uno con su factura), las facturas con su estado y, a la derecha, a quién se factura y
 * con qué datos. El portal no emite facturas: las apunta, las adjunta y las sigue hasta cobrarlas.
 */
export function FacturacionView({ fiscales, astratic, siguiente }: { fiscales: DatosFiscales; astratic: DatosFacturacion; siguiente: string }) {
  const { collab, setCollab, marca, hoy, facturas: [facturas, setFacturasEstado] } = useCollab()
  const [dialogo, setDialogo] = React.useState<{ factura: Factura | null; plazo: string | null } | null>(null)
  const [borrando, setBorrando] = React.useState<Factura | null>(null)
  const dia = soloFecha(hoy)
  const red = collab.tipo === "red"
  const cliente = red ? astratic : collab.facturacion
  const r = resumenFacturacion(collab, facturas, dia)
  const sumaPlazos = collab.plazos.reduce((a, p) => a + p.porcentaje, 0)

  /** Cambia las facturas y, con ellas, el resumen de cobro de la collab. */
  const setFacturas = (cambio: (fs: Factura[]) => Factura[]) => {
    const nuevas = cambio(facturas)
    setFacturasEstado(nuevas)
    setCollab((c) => ({ ...c, cobro: cobroDeFacturas(c, nuevas, dia) }))
  }
  const cambiar = (id: string, datos: Partial<Factura>) => setFacturas((fs) => fs.map((f) => (f.id === id ? { ...f, ...datos } : f)))
  const setPlazos = (cambio: (ps: PlazoCobro[]) => PlazoCobro[]) => setCollab((c) => ({ ...c, plazos: cambio(c.plazos) }))

  const reclamar = (f: Factura) => {
    const { asunto, cuerpo } = emailDeReclamacion({ factura: f, campana: collab.campana, contacto: collab.brief.contacto.nombre, firma: fiscales.nombre })
    window.location.href = `mailto:${cliente?.email ?? collab.brief.contacto.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
  }

  const columnas: Column<Factura>[] = [
    { id: "numero", header: "Número", sortValue: (f) => f.numero, cell: (f) => <span className="inline-flex items-center gap-1.5 font-medium">{f.pdf && <FileTextIcon className="size-3.5 text-muted-foreground" />}{f.numero}</span> },
    { id: "concepto", header: "Concepto", hideBelow: "2xl", cell: (f) => <span className="line-clamp-1 text-muted-foreground">{f.concepto}</span> },
    { id: "emitida", header: "Emitida", hideBelow: "lg", sortValue: (f) => f.emitidaEl, cell: (f) => <span className="text-xs text-muted-foreground">{fmt.date(f.emitidaEl)}</span> },
    { id: "base", header: "Base", align: "right", sortValue: (f) => f.base, cell: (f) => <span className="tabular-nums">{fmt.eurDecimals(f.base)}</span> },
    { id: "total", header: "Total", align: "right", hideBelow: "md", sortValue: (f) => calcularFactura(f).total, cell: (f) => <span className="font-semibold tabular-nums">{fmt.eurDecimals(calcularFactura(f).total)}</span> },
    { id: "vence", header: "Vence", sortValue: (f) => f.vencimiento, cell: (f) => <span className={cn("text-xs", estadoDeFactura(f, dia) === "vencida" ? "font-medium text-danger" : "text-muted-foreground")}>{fmt.date(f.vencimiento)}</span> },
    { id: "estado", header: "Estado", sortValue: (f) => ESTADOS_FACTURA.findIndex((e) => e.id === estadoDeFactura(f, dia)), cell: (f) => { const e = estadoDe(ESTADOS_FACTURA, estadoDeFactura(f, dia)); return <StatusBadge tone={e.tone} dot>{e.label}</StatusBadge> } },
    {
      id: "acciones",
      header: "",
      align: "right",
      cell: (f) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Acciones de la factura ${f.numero}`}>
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!f.enviadaEl && <DropdownMenuItem onSelect={() => { cambiar(f.id, { enviadaEl: dia }); toast.success(`Factura ${f.numero} enviada`) }}><SendIcon /> Marcar como enviada</DropdownMenuItem>}
              {!f.cobradaEl && <DropdownMenuItem onSelect={() => { cambiar(f.id, { cobradaEl: dia }); toast.success(`Factura ${f.numero} cobrada`, { action: { label: "Deshacer", onClick: () => cambiar(f.id, { cobradaEl: undefined }) } }) }}><CheckIcon /> Marcar como cobrada</DropdownMenuItem>}
              {f.cobradaEl && <DropdownMenuItem onSelect={() => cambiar(f.id, { cobradaEl: undefined })}><BanknoteIcon /> Quitar el cobro</DropdownMenuItem>}
              {estadoDeFactura(f, dia) === "vencida" && <DropdownMenuItem onSelect={() => reclamar(f)}><MailIcon /> Reclamar el pago</DropdownMenuItem>}
              <DropdownMenuItem onSelect={async () => { await navigator.clipboard.writeText(datosParaCopiar({ factura: f, cliente, emisora: fiscales })); toast.success("Datos copiados") }}><CopyIcon /> Copiar los datos</DropdownMenuItem>
              {f.pdf && <DropdownMenuItem onSelect={() => toast.success("Descarga preparada")}><DownloadIcon /> Descargar el PDF</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setBorrando(f)}><Trash2Icon /> Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Section className="flex-none">
          <SectionHeader icon={BanknoteIcon} title="Cobro" meta={red ? `Tu 80 % de ${fmt.eur(collab.importe)}` : "Base imponible, sin IVA ni retención"} />
          <SectionBody className="p-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Pactado", valor: r.pactado },
                { label: "Facturado", valor: r.facturado, sub: r.porFacturar > 0 ? `${fmt.eur(r.porFacturar)} por facturar` : "Todo facturado" },
                { label: "Cobrado", valor: r.cobrado },
                { label: "Pendiente", valor: r.pendiente, sub: r.vencido > 0 ? `${fmt.eur(r.vencido)} vencido` : undefined, alerta: r.vencido > 0 },
              ].map((d) => (
                <div key={d.label}>
                  <dt className="text-xs text-muted-foreground">{d.label}</dt>
                  <dd className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{fmt.eur(d.valor)}</dd>
                  {d.sub && <dd className={cn("text-xs", d.alerta ? "font-medium text-danger" : "text-muted-foreground")}>{d.sub}</dd>}
                </div>
              ))}
            </dl>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-label={`Cobrado el ${Math.round((r.cobrado / Math.max(1, r.pactado)) * 100)} %`}>
              <span className="h-full bg-success" style={{ width: `${(r.cobrado / Math.max(1, r.pactado)) * 100}%` }} />
              <span className="h-full bg-info/60" style={{ width: `${(Math.max(0, r.pendiente - r.vencido) / Math.max(1, r.pactado)) * 100}%` }} />
              <span className="h-full bg-danger" style={{ width: `${(r.vencido / Math.max(1, r.pactado)) * 100}%` }} />
            </div>
          </SectionBody>
        </Section>

        <Section className="flex-none">
          <SectionHeader icon={ReceiptTextIcon} title="Plan de cobro" count={collab.plazos.length} meta={sumaPlazos === 100 ? "Suma el 100 %" : `Suma el ${sumaPlazos} %: ajusta los plazos`} action={<Button variant="ghost" size="sm" onClick={() => setPlazos((ps) => [...ps, { id: idNuevo("pl"), concepto: "Nuevo plazo", porcentaje: Math.max(0, 100 - sumaPlazos) }])}><PlusIcon /> Añadir plazo</Button>} />
          <SectionBody>
            <ul className="divide-y">
              {collab.plazos.map((p) => {
                const factura = facturas.find((f) => f.plazoId === p.id)
                const e = factura ? estadoDe(ESTADOS_FACTURA, estadoDeFactura(factura, dia)) : null
                return (
                  <li key={p.id} className="grid items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_88px_110px_200px]">
                    <InlineField value={p.concepto} tipo="texto" onSave={async (v) => setPlazos((ps) => ps.map((x) => (x.id === p.id ? { ...x, concepto: String(v ?? x.concepto) } : x)))} />
                    <InlineField value={p.porcentaje} tipo="numero" onSave={async (v) => setPlazos((ps) => ps.map((x) => (x.id === p.id ? { ...x, porcentaje: Math.min(100, Math.max(0, Number(v) || 0)) } : x)))} render={(v) => <span className="tabular-nums">{String(v)} %</span>} />
                    <span className="text-sm font-medium tabular-nums sm:text-right">{fmt.eur(importeDePlazo(collab, p))}</span>
                    <span className="flex items-center justify-end gap-2">
                      {factura && e ? (
                        <button type="button" onClick={() => setDialogo({ factura, plazo: null })} className="inline-flex items-center gap-2 text-sm hover:underline">
                          {factura.numero} <StatusBadge tone={e.tone} dot>{e.label}</StatusBadge>
                        </button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setDialogo({ factura: null, plazo: p.id })}>
                          <PlusIcon /> Añadir factura
                        </Button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </SectionBody>
        </Section>

        <Section className="flex-none">
          <SectionHeader icon={FileTextIcon} title="Facturas" count={facturas.length} action={<Button size="sm" onClick={() => setDialogo({ factura: null, plazo: siguientePlazo(collab, facturas)?.id ?? null })}><PlusIcon /> Añadir factura</Button>} />
          <SectionBody>
            <DataTable rows={facturas} columns={columnas} getRowId={(f) => f.id} onRowClick={(f) => setDialogo({ factura: f, plazo: null })} emptyState={<EmptyState icon={ReceiptTextIcon} title="Sin facturas todavía" description="Haz la factura con tu programa y apúntala aquí con su PDF: el plan de cobro y el resumen se actualizan solos." action={<Button size="sm" onClick={() => setDialogo({ factura: null, plazo: siguientePlazo(collab, facturas)?.id ?? null })}><PlusIcon /> Añadir factura</Button>} />} />
          </SectionBody>
          {facturas.length > 0 && <SectionFooter>Total facturado con IVA y retención: {fmt.eurDecimals(facturas.reduce((a, f) => a + calcularFactura(f).total, 0))}</SectionFooter>}
        </Section>
      </div>

      <DatosFacturar red={red} cliente={cliente} fiscales={fiscales} marca={marca.nombre} onCliente={(d) => setCollab((c) => ({ ...c, facturacion: d }))} />

      {dialogo && (
        <FacturaDialog
          key={dialogo.factura?.id ?? `nueva-${dialogo.plazo}`}
          open
          onOpenChange={(o) => !o && setDialogo(null)}
          collab={collab}
          factura={dialogo.factura}
          siguiente={siguiente}
          plazoInicial={dialogo.plazo}
          destinatario={red ? "astratic" : "marca"}
          cliente={cliente}
          fiscales={fiscales}
          hoy={hoy}
          onGuardar={(f) => {
            const existe = facturas.some((x) => x.id === f.id)
            setFacturas((fs) => (existe ? fs.map((x) => (x.id === f.id ? f : x)) : [...fs, f]))
            toast.success(existe ? `Factura ${f.numero} guardada` : `Factura ${f.numero} añadida`)
          }}
        />
      )}
      <ConfirmDialog
        open={borrando !== null}
        onOpenChange={(o) => !o && setBorrando(null)}
        title={`¿Eliminar la factura ${borrando?.numero ?? ""}?`}
        description="Se quita de esta collab (no de tu programa de facturación)."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (!borrando) return
          const previas = facturas
          setFacturas((fs) => fs.filter((f) => f.id !== borrando.id))
          toast.success(`Factura ${borrando.numero} eliminada`, { action: { label: "Deshacer", onClick: () => setFacturas(() => previas) } })
        }}
      />
      <p className="text-xs text-muted-foreground xl:col-span-2">
        Las facturas las emite tu programa de facturación (desde 2027, con Verifactu). Aquí se apuntan con su PDF para saber qué falta por cobrar. Tus datos fiscales están en <Link href="/workspace/ajustes" className="text-brand hover:underline">Ajustes</Link>.
      </p>
    </div>
  )
}
