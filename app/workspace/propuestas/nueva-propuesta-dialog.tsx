"use client"

import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FORMATOS, LISTA_FORMATOS, ORIGENES, type Marca, type OrigenPropuesta, type PiezaPedida, type Propuesta } from "@/lib/influencer/modelo"
import { tintFor } from "@/lib/influencer/tints"
import { idNuevo } from "@/lib/influencer/tareas"
import { sumarDias } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const NUEVA = "__nueva__"

const cantidad = z.number({ error: "Escribe un número" }).int().min(0).max(20)
const cantidades = z.object({ reel: cantidad, story: cantidad, post: cantidad, tiktok: cantidad, youtube: cantidad, ugc: cantidad })

const esquema = z
  .object({
    marcaId: z.string().min(1, "Elige la marca"),
    nombreMarca: z.string().trim().max(60).optional(),
    campana: z.string().trim().min(1, "Ponle nombre a la campaña").max(80),
    origen: z.enum(["marca", "red", "mediakit"]),
    cantidades,
    ofrecen: z.string().trim().optional(),
    desde: z.string().optional(),
    hasta: z.string().optional(),
    notas: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.marcaId !== NUEVA || (v.nombreMarca && v.nombreMarca.length > 0), { message: "Escribe el nombre de la marca", path: ["nombreMarca"] })
  .refine((v) => Object.values(v.cantidades).some((n) => n > 0), { message: "Indica al menos una pieza", path: ["cantidades"] })

type Valores = z.infer<typeof esquema>

/** Alta rápida de una propuesta, pensada para el móvil: marca, campaña, qué piden y poco más. */
export function NuevaPropuestaDialog({
  open,
  onOpenChange,
  marcas,
  hoy,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  marcas: Marca[]
  hoy: string
  onCreate: (propuesta: Propuesta, nuevaMarca?: Marca) => void
}) {
  const { register, handleSubmit, control, reset, formState } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { marcaId: "", nombreMarca: "", campana: "", origen: "marca", cantidades: { reel: 1, story: 0, post: 0, tiktok: 0, youtube: 0, ugc: 0 }, ofrecen: "", desde: "", hasta: "", notas: "" },
  })
  const { errors } = formState
  const marcaId = useWatch({ control, name: "marcaId" })

  React.useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const crear = (v: Valores) => {
    let nuevaMarca: Marca | undefined
    let id = v.marcaId
    if (v.marcaId === NUEVA && v.nombreMarca) {
      id = idNuevo("m")
      nuevaMarca = { id, nombre: v.nombreMarca, sector: "", tint: tintFor(v.nombreMarca), atribucion: v.origen === "red" ? "red" : "propia", atribucionHasta: v.origen === "red" ? undefined : sumarDias(hoy, 365), contactos: [] }
    }
    const piezas: PiezaPedida[] = LISTA_FORMATOS.filter((f) => v.cantidades[f] > 0).map((f) => ({ formato: f, cantidad: v.cantidades[f] }))
    const ofrecen = v.ofrecen ? Number(v.ofrecen.replace(",", ".")) : undefined
    onCreate(
      {
        id: idNuevo("p"),
        marcaId: id,
        campana: v.campana,
        estado: "nueva",
        origen: v.origen,
        piezas,
        ofrecen: Number.isFinite(ofrecen) ? ofrecen : undefined,
        desde: v.desde || undefined,
        hasta: v.hasta || undefined,
        ultimoContacto: hoy,
        notas: v.notas || undefined,
        creadaEl: hoy,
      },
      nuevaMarca,
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nueva propuesta</DialogTitle>
          <DialogDescription>Apunta lo que te han pedido; el presupuesto y el media kit se preparan después desde su ficha.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(crear)} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.marcaId || undefined}>
              <FieldLabel htmlFor="np-marca">Marca</FieldLabel>
              <Controller
                control={control}
                name="marcaId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="np-marca" className="w-full" aria-invalid={!!errors.marcaId}>
                      <SelectValue placeholder="Elige o crea una" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                      <SelectItem value={NUEVA}>+ Nueva marca</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.marcaId]} />
            </Field>
            {marcaId === NUEVA ? (
              <Field data-invalid={!!errors.nombreMarca || undefined}>
                <FieldLabel htmlFor="np-nombre">Nombre de la marca</FieldLabel>
                <Input id="np-nombre" placeholder="Kalma Cosmetics" autoFocus aria-invalid={!!errors.nombreMarca} {...register("nombreMarca")} />
                <FieldError errors={[errors.nombreMarca]} />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="np-origen">Cómo ha llegado</FieldLabel>
                <Controller
                  control={control}
                  name="origen"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="np-origen" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ORIGENES) as OrigenPropuesta[]).map((o) => (
                          <SelectItem key={o} value={o}>
                            {ORIGENES[o]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
          </div>
          <Field data-invalid={!!errors.campana || undefined}>
            <FieldLabel htmlFor="np-campana">Campaña</FieldLabel>
            <Input id="np-campana" placeholder="Lanzamiento de la base Pure" aria-invalid={!!errors.campana} {...register("campana")} />
            <FieldError errors={[errors.campana]} />
          </Field>
          <Field data-invalid={!!errors.cantidades || undefined}>
            <FieldLabel>Qué piden</FieldLabel>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {LISTA_FORMATOS.map((f) => (
                <label key={f} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {FORMATOS[f].label}
                  <Input type="number" min={0} max={20} inputMode="numeric" className="h-8 px-2 tabular-nums" {...register(`cantidades.${f}`, { valueAsNumber: true })} />
                </label>
              ))}
            </div>
            <FieldError errors={[errors.cantidades?.root ?? errors.cantidades]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="np-ofrecen">Ofrecen (€)</FieldLabel>
              <Input id="np-ofrecen" inputMode="decimal" placeholder="Si lo han dicho" {...register("ofrecen")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="np-desde">Publicar desde</FieldLabel>
              <Input id="np-desde" type="date" {...register("desde")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="np-hasta">Hasta</FieldLabel>
              <Input id="np-hasta" type="date" {...register("hasta")} />
            </Field>
          </div>
          <Field data-invalid={!!errors.notas || undefined}>
            <FieldLabel htmlFor="np-notas">Notas</FieldLabel>
            <Textarea id="np-notas" rows={2} placeholder="Lo que te han dicho y no quieres olvidar" {...register("notas")} />
            <FieldError errors={[errors.notas]} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear propuesta</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
