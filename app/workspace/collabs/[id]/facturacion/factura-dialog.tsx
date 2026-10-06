"use client"

import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { CopyIcon, FileTextIcon, XIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import type { Collab, DatosFacturacion, DatosFiscales, Factura } from "@/lib/influencer/modelo"
import { calcularFactura, conceptoPorDefecto, datosParaCopiar, importeDePlazo, vencimientoPorDefecto } from "@/lib/influencer/facturacion"
import { idNuevo } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ZonaSubida } from "@/components/influencer/zona-subida"

const SIN_PLAZO = "sin-plazo"

const esquema = z
  .object({
    numero: z.string().trim().min(1, "Pon el número de tu factura"),
    emitidaEl: z.string().min(1, "Falta la fecha"),
    plazoId: z.string(),
    concepto: z.string().trim().min(1, "Falta el concepto").max(200),
    base: z.number({ error: "Escribe la base" }).positive("Tiene que ser mayor que 0"),
    ivaPct: z.number({ error: "Escribe el IVA" }).min(0).max(21),
    irpfPct: z.number({ error: "Escribe la retención" }).min(0).max(19),
    vencimiento: z.string().min(1, "Falta la fecha"),
  })
  .refine((v) => v.vencimiento >= v.emitidaEl, { message: "No puede vencer antes de emitirse", path: ["vencimiento"] })

type Valores = z.infer<typeof esquema>

/**
 * Apuntar una factura de la collab: la hace ella con su programa y aquí queda con su número, sus
 * importes calculados (IVA y retención), el vencimiento y su PDF. Lleva los datos para copiar.
 */
export function FacturaDialog({ open, onOpenChange, collab, factura, siguiente, plazoInicial, destinatario, cliente, fiscales, hoy, onGuardar }: { open: boolean; onOpenChange: (o: boolean) => void; collab: Collab; factura: Factura | null; siguiente: string; plazoInicial: string | null; destinatario: Factura["destinatario"]; cliente?: DatosFacturacion; fiscales: DatosFiscales; hoy: string; onGuardar: (f: Factura) => void }) {
  const dia = soloFecha(hoy)
  const plazo = collab.plazos.find((p) => p.id === (factura?.plazoId ?? plazoInicial))
  const inicial: Valores = factura
    ? { numero: factura.numero, emitidaEl: factura.emitidaEl, plazoId: factura.plazoId ?? SIN_PLAZO, concepto: factura.concepto, base: factura.base, ivaPct: factura.ivaPct, irpfPct: factura.irpfPct, vencimiento: factura.vencimiento }
    : { numero: siguiente, emitidaEl: dia, plazoId: plazo?.id ?? SIN_PLAZO, concepto: conceptoPorDefecto(collab, plazo), base: plazo ? importeDePlazo(collab, plazo) : collab.importeNeto ?? collab.importe, ivaPct: fiscales.ivaPct, irpfPct: fiscales.irpfPct, vencimiento: vencimientoPorDefecto(dia, collab.brief.condicionesPago) }
  const { register, handleSubmit, control, setValue, formState } = useForm<Valores>({ resolver: zodResolver(esquema), values: inicial })
  const { errors } = formState
  const [pdf, setPdf] = React.useState<Factura["pdf"]>(factura?.pdf)
  const [base, ivaPct, irpfPct, concepto, vencimiento] = useWatch({ control, name: ["base", "ivaPct", "irpfPct", "concepto", "vencimiento"] })
  const calculo = calcularFactura({ base: Number(base) || 0, ivaPct: Number(ivaPct) || 0, irpfPct: Number(irpfPct) || 0 })

  const elegirPlazo = (id: string) => {
    setValue("plazoId", id)
    const p = collab.plazos.find((x) => x.id === id)
    if (!p || factura) return
    setValue("base", importeDePlazo(collab, p))
    setValue("concepto", conceptoPorDefecto(collab, p))
  }

  const guardar = (v: Valores) => {
    onGuardar({ id: factura?.id ?? idNuevo("fa"), collabId: collab.id, numero: v.numero, destinatario, concepto: v.concepto, base: v.base, ivaPct: v.ivaPct, irpfPct: v.irpfPct, emitidaEl: v.emitidaEl, vencimiento: v.vencimiento, plazoId: v.plazoId === SIN_PLAZO ? undefined : v.plazoId, pdf, enviadaEl: factura?.enviadaEl, cobradaEl: factura?.cobradaEl })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{factura ? `Factura ${factura.numero}` : "Añadir factura"}</DialogTitle>
          <DialogDescription>La haces con tu programa de facturación y aquí la apuntas con su PDF para seguirla hasta cobrarla. {destinatario === "astratic" ? "En las collabs de la red, la factura va a Astratic por tu parte." : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(guardar)} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={!!errors.numero || undefined}>
              <FieldLabel htmlFor="fa-numero">Número</FieldLabel>
              <Input id="fa-numero" aria-invalid={!!errors.numero} {...register("numero")} />
              <FieldError errors={[errors.numero]} />
            </Field>
            <Field data-invalid={!!errors.emitidaEl || undefined}>
              <FieldLabel htmlFor="fa-emitida">Emitida</FieldLabel>
              <Input id="fa-emitida" type="date" aria-invalid={!!errors.emitidaEl} {...register("emitidaEl")} />
              <FieldError errors={[errors.emitidaEl]} />
            </Field>
            <Field data-invalid={!!errors.vencimiento || undefined}>
              <FieldLabel htmlFor="fa-vence">Vence</FieldLabel>
              <Input id="fa-vence" type="date" aria-invalid={!!errors.vencimiento} {...register("vencimiento")} />
              <FieldError errors={[errors.vencimiento]} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fa-plazo">Plazo de cobro</FieldLabel>
            <Controller
              control={control}
              name="plazoId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={elegirPlazo}>
                  <SelectTrigger id="fa-plazo" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collab.plazos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.concepto} · {p.porcentaje} % · {fmt.eur(importeDePlazo(collab, p))}
                      </SelectItem>
                    ))}
                    <SelectItem value={SIN_PLAZO}>Sin plazo (un extra, por ejemplo)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field data-invalid={!!errors.concepto || undefined}>
            <FieldLabel htmlFor="fa-concepto">Concepto</FieldLabel>
            <Input id="fa-concepto" aria-invalid={!!errors.concepto} {...register("concepto")} />
            <FieldError errors={[errors.concepto]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={!!errors.base || undefined}>
              <FieldLabel htmlFor="fa-base">Base imponible (€)</FieldLabel>
              <Input id="fa-base" type="number" step="0.01" min={0} inputMode="decimal" aria-invalid={!!errors.base} {...register("base", { valueAsNumber: true })} />
              <FieldError errors={[errors.base]} />
            </Field>
            <Field data-invalid={!!errors.ivaPct || undefined}>
              <FieldLabel htmlFor="fa-iva">IVA (%)</FieldLabel>
              <Input id="fa-iva" type="number" step="1" min={0} max={21} inputMode="numeric" {...register("ivaPct", { valueAsNumber: true })} />
              <FieldError errors={[errors.ivaPct]} />
            </Field>
            <Field data-invalid={!!errors.irpfPct || undefined}>
              <FieldLabel htmlFor="fa-irpf">Retención IRPF (%)</FieldLabel>
              <Input id="fa-irpf" type="number" step="1" min={0} max={19} inputMode="numeric" {...register("irpfPct", { valueAsNumber: true })} />
              <FieldError errors={[errors.irpfPct]} />
            </Field>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-muted px-4 py-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Base</dt><dd className="tabular-nums">{fmt.eurDecimals(calculo.base)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">IVA</dt><dd className="tabular-nums">+{fmt.eurDecimals(calculo.iva)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Retención</dt><dd className="tabular-nums">−{fmt.eurDecimals(calculo.irpf)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Total a cobrar</dt><dd className="font-semibold tabular-nums">{fmt.eurDecimals(calculo.total)}</dd></div>
          </dl>

          <Field>
            <FieldLabel>PDF de la factura</FieldLabel>
            {pdf ? (
              <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2">
                <FileTextIcon className="size-5 text-danger" />
                <span className="min-w-0 flex-1 truncate text-sm">{pdf.nombre}</span>
                <span className="text-xs text-muted-foreground">{fmt.bytes(pdf.tamano)}</span>
                <Button type="button" variant="ghost" size="icon-xs" aria-label="Quitar el PDF" onClick={() => setPdf(undefined)}>
                  <XIcon />
                </Button>
              </div>
            ) : (
              <ZonaSubida compacta accept="application/pdf" multiple={false} titulo="Sube el PDF que te dio tu programa" onArchivos={(fs) => fs[0] && setPdf({ nombre: fs[0].name, tamano: fs[0].size })} />
            )}
          </Field>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(datosParaCopiar({ factura: { concepto, base: Number(base) || 0, ivaPct: Number(ivaPct) || 0, irpfPct: Number(irpfPct) || 0, vencimiento }, cliente, emisora: fiscales }))
                toast.success("Datos copiados: pégalos en tu programa de facturación")
              }}
            >
              <CopyIcon /> Copiar los datos
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">{factura ? "Guardar" : "Añadir factura"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
