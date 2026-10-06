"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FORMATOS, LISTA_FORMATOS, TIPOS_COLLAB, type Collab, type Marca, type Pieza, type TipoCollab } from "@/lib/influencer/modelo"
import { idNuevo } from "@/lib/influencer/tareas"
import { importeNeto } from "@/lib/influencer/presupuesto"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const cantidad = z.number({ error: "Escribe un número" }).int().min(0).max(20)

const esquema = z
  .object({
    marcaId: z.string().min(1, "Elige la marca"),
    campana: z.string().trim().min(1, "Ponle nombre a la campaña").max(80),
    tipo: z.enum(["directa", "red", "regalo", "ugc"]),
    importe: z.number({ error: "Escribe el importe" }).min(0),
    desde: z.string().min(1, "Falta la fecha"),
    hasta: z.string().min(1, "Falta la fecha"),
    cantidades: z.object({ reel: cantidad, story: cantidad, post: cantidad, tiktok: cantidad, youtube: cantidad, ugc: cantidad }),
  })
  .refine((v) => v.hasta >= v.desde, { message: "Tiene que ser después del inicio", path: ["hasta"] })
  .refine((v) => Object.values(v.cantidades).some((n) => n > 0), { message: "Indica al menos una pieza", path: ["cantidades"] })

type Valores = z.infer<typeof esquema>

/** Alta de una collab a mano (las que vienen de una propuesta ganada se crean solas): lo justo para empezar el brief. */
export function NuevaCollabDialog({ open, onOpenChange, marcas, hoy, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; marcas: Marca[]; hoy: string; onCreate: (collab: Collab) => void }) {
  const { register, handleSubmit, control, reset, formState } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { marcaId: "", campana: "", tipo: "directa", importe: 0, desde: "", hasta: "", cantidades: { reel: 1, story: 0, post: 0, tiktok: 0, youtube: 0, ugc: 0 } },
  })
  const { errors } = formState

  React.useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const crear = (v: Valores) => {
    const marca = marcas.find((m) => m.id === v.marcaId)
    if (!marca) return
    const id = idNuevo("c")
    const piezas: Pieza[] = LISTA_FORMATOS.filter((f) => v.cantidades[f] > 0).flatMap((f): Pieza[] => {
      const n = v.cantidades[f]
      // Las stories van en una sola pieza (se graban y aprueban juntas); el resto, una pieza por unidad.
      if (f === "story") return [{ id: idNuevo("pz"), collabId: id, formato: f, unidades: n, titulo: `${n} ${n === 1 ? "story" : "stories"}`, publicacion: v.hasta, estado: "borrador", guion: [], video: [], rondaActual: 1 }]
      return Array.from({ length: n }, (_, i) => ({ id: idNuevo("pz"), collabId: id, formato: f, unidades: 1, titulo: n === 1 ? FORMATOS[f].label : `${FORMATOS[f].label} ${i + 1}`, publicacion: v.hasta, estado: "borrador", guion: [], video: [], rondaActual: 1 }))
    })
    onCreate({
      id,
      marcaId: marca.id,
      campana: v.campana,
      tipo: v.tipo,
      estado: "por-empezar",
      importe: v.importe,
      importeNeto: v.tipo === "red" ? importeNeto(v.importe) : undefined,
      tint: marca.tint,
      desde: v.desde,
      hasta: v.hasta,
      brief: { objetivo: "", mensajesClave: [], menciones: [], hashtags: [], rondasIncluidas: 2, claimsPermitidos: [], claimsProhibidos: [], hacer: [], evitar: [], contacto: { nombre: marca.contactos[0]?.nombre ?? "", email: marca.contactos[0]?.email ?? "" }, condicionesPago: "" },
      piezas,
      cobro: { estado: "por-facturar" },
      creadaEl: hoy,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nueva collab</DialogTitle>
          <DialogDescription>Las piezas se crean con la fecha final; después se ajusta cada una en Contenidos y el brief se rellena en su pestaña.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(crear)} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.marcaId || undefined}>
              <FieldLabel htmlFor="nc-marca">Marca</FieldLabel>
              <Controller
                control={control}
                name="marcaId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="nc-marca" className="w-full" aria-invalid={!!errors.marcaId}>
                      <SelectValue placeholder="Elige la marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.marcaId]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="nc-tipo">Tipo</FieldLabel>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="nc-tipo" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPOS_COLLAB) as TipoCollab[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPOS_COLLAB[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <Field data-invalid={!!errors.campana || undefined}>
            <FieldLabel htmlFor="nc-campana">Campaña</FieldLabel>
            <Input id="nc-campana" placeholder="Lanzamiento de otoño" aria-invalid={!!errors.campana} {...register("campana")} />
            <FieldError errors={[errors.campana]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={!!errors.importe || undefined}>
              <FieldLabel htmlFor="nc-importe">Importe (€)</FieldLabel>
              <Input id="nc-importe" type="number" min={0} step={10} inputMode="decimal" aria-invalid={!!errors.importe} {...register("importe", { valueAsNumber: true })} />
              <FieldError errors={[errors.importe]} />
            </Field>
            <Field data-invalid={!!errors.desde || undefined}>
              <FieldLabel htmlFor="nc-desde">Empieza</FieldLabel>
              <Input id="nc-desde" type="date" aria-invalid={!!errors.desde} {...register("desde")} />
              <FieldError errors={[errors.desde]} />
            </Field>
            <Field data-invalid={!!errors.hasta || undefined}>
              <FieldLabel htmlFor="nc-hasta">Última publicación</FieldLabel>
              <Input id="nc-hasta" type="date" aria-invalid={!!errors.hasta} {...register("hasta")} />
              <FieldError errors={[errors.hasta]} />
            </Field>
          </div>
          <Field data-invalid={!!errors.cantidades || undefined}>
            <FieldLabel>Piezas</FieldLabel>
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear collab</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
