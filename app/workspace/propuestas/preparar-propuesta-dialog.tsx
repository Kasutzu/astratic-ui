"use client"

import * as React from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { EXTRAS, FORMATOS, LISTA_FORMATOS, type ExtraId, type LineaPresupuesto, type Marca, type Presupuesto, type Propuesta, type Tarifa } from "@/lib/influencer/modelo"
import { calcularPresupuesto, lineasDesdePiezas, tarifaDe } from "@/lib/influencer/presupuesto"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const esquema = z.object({
  lineas: z
    .array(
      z.object({
        formato: z.enum(LISTA_FORMATOS),
        cantidad: z.number({ error: "Escribe un número" }).int().min(1, "Mínimo 1").max(50),
        precio: z.number({ error: "Escribe un número" }).min(0, "Sin negativos"),
      }),
    )
    .min(1, "Añade al menos una línea"),
  extras: z.array(z.enum(EXTRAS.map((e) => e.id))),
  conPrecios: z.boolean(),
})

type Valores = z.infer<typeof esquema>

/**
 * «Preparar propuesta» en un paso: el presupuesto (piezas a sus tarifas, extras que suben el fee y
 * el aviso si queda bajo su mínimo) y el media kit, con o sin precios. Al guardar se abre el
 * documento, listo para mandar como PDF o como enlace.
 */
export function PrepararPropuestaDialog({
  propuesta,
  marca,
  tarifas,
  hoy,
  onOpenChange,
  onSave,
}: {
  propuesta: Propuesta | null
  marca: Marca | null
  tarifas: Tarifa[]
  hoy: string
  onOpenChange: (open: boolean) => void
  onSave: (presupuesto: Presupuesto) => void
}) {
  const { register, control, handleSubmit, reset, setValue, formState } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { lineas: [], extras: [], conPrecios: true },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "lineas" })
  const { errors } = formState
  const valores = useWatch({ control })

  React.useEffect(() => {
    if (!propuesta) return
    reset(propuesta.presupuesto ? { lineas: propuesta.presupuesto.lineas, extras: propuesta.presupuesto.extras, conPrecios: propuesta.presupuesto.conPrecios } : { lineas: lineasDesdePiezas(propuesta.piezas, tarifas), extras: [], conPrecios: true })
  }, [propuesta, tarifas, reset])

  // Mientras se escribe, el formulario puede tener huecos: se calcula con lo que ya es un número.
  const lineasActuales: LineaPresupuesto[] = (valores.lineas ?? []).map((l) => ({ formato: l?.formato ?? "reel", cantidad: Number(l?.cantidad) || 0, precio: Number(l?.precio) || 0 }))
  const extrasActuales = (valores.extras ?? []).filter((e): e is ExtraId => e !== undefined)
  const calculo = calcularPresupuesto({ lineas: lineasActuales, extras: extrasActuales }, tarifas)
  const ofrecen = propuesta?.ofrecen

  const guardar = (v: Valores) => {
    if (!propuesta) return
    onSave({ lineas: v.lineas, extras: v.extras, conPrecios: v.conPrecios, generadoEl: hoy })
    onOpenChange(false)
    window.open(`/propuesta/${propuesta.id}`, "_blank", "noopener")
  }

  return (
    <Dialog open={propuesta !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Preparar propuesta{marca ? ` para ${marca.nombre}` : ""}</DialogTitle>
          <DialogDescription>El presupuesto con tus tarifas y el media kit en un documento: se manda como PDF o como enlace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(guardar)} noValidate className="grid gap-5">
          <Field data-invalid={!!errors.lineas || undefined}>
            <FieldLabel>Presupuesto</FieldLabel>
            <div className="flex flex-col gap-2">
              {fields.map((f, i) => {
                const linea = valores.lineas?.[i]
                return (
                  <div key={f.id} className="grid grid-cols-[1fr_64px_96px_auto_32px] items-center gap-2">
                    <Controller
                      control={control}
                      name={`lineas.${i}.formato`}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            const t = tarifaDe(v as Valores["lineas"][number]["formato"], tarifas)
                            if (t) setValue(`lineas.${i}.precio`, t.precio)
                          }}
                        >
                          <SelectTrigger className="w-full" aria-label="Formato">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LISTA_FORMATOS.map((fo) => (
                              <SelectItem key={fo} value={fo}>
                                {FORMATOS[fo].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Input type="number" min={1} aria-label="Cantidad" className="h-8 px-2 tabular-nums" {...register(`lineas.${i}.cantidad`, { valueAsNumber: true })} />
                    <div className="relative">
                      <Input type="number" min={0} step={10} aria-label="Precio" className="h-8 pr-6 pl-2 tabular-nums" {...register(`lineas.${i}.precio`, { valueAsNumber: true })} />
                      <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-xs text-muted-foreground">€</span>
                    </div>
                    <span className="w-20 text-right text-sm font-medium tabular-nums">{fmt.eur((Number(linea?.cantidad) || 0) * (Number(linea?.precio) || 0))}</span>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar línea" onClick={() => remove(i)} disabled={fields.length === 1}>
                      <Trash2Icon />
                    </Button>
                  </div>
                )
              })}
              <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => append({ formato: "story", cantidad: 1, precio: tarifaDe("story", tarifas)?.precio ?? 0 })}>
                <PlusIcon /> Añadir línea
              </Button>
            </div>
            <FieldError errors={[errors.lineas?.root ?? errors.lineas]} />
          </Field>

          <Field>
            <FieldLabel>Extras que suben el fee</FieldLabel>
            <Controller
              control={control}
              name="extras"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {EXTRAS.map((e) => {
                    const marcado = field.value.includes(e.id)
                    return (
                      <label key={e.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-soft">
                        <Checkbox checked={marcado} onCheckedChange={(c) => field.onChange(c ? [...field.value, e.id] : field.value.filter((x) => x !== e.id))} className="mt-0.5" />
                        <span className="grid gap-0.5">
                          <span className="font-medium">
                            {e.label} <span className="text-muted-foreground">+{Math.round(e.recargo * 100)} %</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{e.descripcion}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            />
          </Field>

          <div className="rounded-xl bg-muted/60 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Piezas</span>
              <span className="tabular-nums">{fmt.eur(calculo.subtotal)}</span>
            </div>
            {calculo.recargos.map((r) => (
              <div key={r.id} className="flex justify-between text-muted-foreground">
                <span>{r.label}</span>
                <span className="tabular-nums">+{fmt.eur(r.importe)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{fmt.eur(calculo.total)}</span>
            </div>
            {(calculo.bajoMinimo || (ofrecen !== undefined && ofrecen > 0 && ofrecen < calculo.minimo)) && (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-warning">
                <TriangleAlertIcon className="mt-px size-3.5 flex-none" />
                {calculo.bajoMinimo ? `Por debajo de tu mínimo pactado para estas piezas (${fmt.eur(calculo.minimo)}).` : `La marca ofrece ${fmt.eur(ofrecen ?? 0)}: por debajo de tu mínimo (${fmt.eur(calculo.minimo)}). Tu presupuesto va por ${fmt.eur(calculo.total)}.`}
              </p>
            )}
          </div>

          <Field>
            <Controller
              control={control}
              name="conPrecios"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="grid gap-0.5">
                    <span className="font-medium">Media kit con tarifas de salida</span>
                    <span className="text-xs text-muted-foreground">Tu foto, tus cifras, tu audiencia y las marcas con las que has trabajado van siempre; los precios, si quieres.</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar y ver el documento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
