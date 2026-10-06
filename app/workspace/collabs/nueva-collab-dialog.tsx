"use client"

import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FilePenLineIcon, SendIcon } from "lucide-react"
import { TIPOS_COLLAB, type Collab, type Contacto, type FormularioMarca, type Marca, type TipoCollab } from "@/lib/influencer/modelo"
import { PIEZA_VACIA, caducidad, esquemaPiezaPedida, piezaNueva, tokenNuevo } from "@/lib/influencer/formularios"
import { idNuevo } from "@/lib/influencer/tareas"
import { importeNeto } from "@/lib/influencer/presupuesto"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PiezasEditor } from "@/components/influencer/piezas-editor"

const OTRA = "otra"

const esquema = z
  .object({
    modo: z.enum(["yo", "marca"]),
    marcaId: z.string().min(1, "Elige la marca"),
    campana: z.string().trim().min(1, "Ponle nombre a la campaña").max(80),
    tipo: z.enum(["directa", "red", "regalo", "ugc"]),
    importe: z.number({ error: "Escribe el importe" }).min(0),
    desde: z.string().min(1, "Falta la fecha"),
    hasta: z.string().min(1, "Falta la fecha"),
    piezas: z.array(esquemaPiezaPedida),
    contactoId: z.string(),
    para: z.object({ nombre: z.string().trim(), email: z.string().trim() }),
    alcance: z.enum(["brief", "materiales"]),
    mensaje: z.string().max(600),
  })
  .refine((v) => v.hasta >= v.desde, { message: "Tiene que ser después del inicio", path: ["hasta"] })
  .refine((v) => v.modo === "marca" || v.piezas.length > 0, { message: "Añade al menos una pieza", path: ["piezas"] })
  .refine((v) => v.modo === "yo" || v.para.nombre.length > 0, { message: "¿A quién se lo mandas?", path: ["para", "nombre"] })
  .refine((v) => v.modo === "yo" || z.string().email().safeParse(v.para.email).success, { message: "Revisa el email", path: ["para", "email"] })

type Valores = z.infer<typeof esquema>

const mensajePorDefecto = (nombre: string) => `Hola${nombre ? ` ${nombre.split(" ")[0]}` : ""}: aquí puedes contarme la campaña y las piezas que necesitáis, y subir los materiales. Así lo tengo todo en un sitio.`

export type CollabCreada = { collab: Collab; formulario?: FormularioMarca }

/**
 * Alta de una collab que no viene de una propuesta (un regalo, un trato cerrado por WhatsApp). O la
 * rellena ella con sus piezas, o le manda a la marca un formulario por enlace para que cuente la
 * campaña, las piezas y los materiales: la collab queda «esperando el brief».
 */
export function NuevaCollabDialog({ open, onOpenChange, marcas, contactos, hoy, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; marcas: Marca[]; contactos: Contacto[]; hoy: string; onCreate: (creada: CollabCreada) => void }) {
  const vacio: Valores = { modo: "yo", marcaId: "", campana: "", tipo: "directa", importe: 0, desde: "", hasta: "", piezas: [{ ...PIEZA_VACIA }], contactoId: OTRA, para: { nombre: "", email: "" }, alcance: "brief", mensaje: mensajePorDefecto("") }
  const { register, handleSubmit, control, reset, setValue, getValues, formState } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: vacio })
  const { errors } = formState
  const [modo, marcaId, desde, hasta] = useWatch({ control, name: ["modo", "marcaId", "desde", "hasta"] })
  const deLaMarca = contactos.filter((c) => c.marcaId === marcaId)

  const elegirContacto = (id: string) => {
    const c = deLaMarca.find((x) => x.id === id)
    setValue("contactoId", id)
    setValue("para", { nombre: c?.nombre ?? "", email: c?.email ?? "" })
    if (getValues("mensaje") === mensajePorDefecto("") || deLaMarca.some((x) => getValues("mensaje") === mensajePorDefecto(x.nombre))) setValue("mensaje", mensajePorDefecto(c?.nombre ?? ""))
  }

  const crear = (v: Valores) => {
    const marca = marcas.find((m) => m.id === v.marcaId)
    if (!marca) return
    const id = idNuevo("c")
    const principal = deLaMarca.find((c) => c.principal) ?? deLaMarca[0]
    const collab: Collab = {
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
      brief: { texto: "", menciones: [], hashtags: [], rondasIncluidas: 2, contacto: { nombre: v.modo === "marca" ? v.para.nombre : (principal?.nombre ?? ""), email: v.modo === "marca" ? v.para.email : (principal?.email ?? "") }, condicionesPago: "30 días tras publicar" },
      piezas: v.modo === "yo" ? v.piezas.map((p) => piezaNueva({ collabId: id, tipo: p.tipo, titulo: p.titulo, publicacion: p.publicacion || v.hasta, red: p.red, indicaciones: p.indicaciones })) : [],
      cobro: { estado: "por-facturar" },
      plazos: [{ id: idNuevo("pl"), concepto: "A 30 días tras publicar", porcentaje: 100 }],
      creadaEl: hoy,
    }
    const formulario: FormularioMarca | undefined =
      v.modo === "marca" ? { id: idNuevo("fm"), token: tokenNuevo("fm"), collabId: id, alcance: v.alcance, para: v.para, mensaje: v.mensaje.trim() || undefined, creadoEl: hoy, caduca: caducidad(hoy) } : undefined
    onCreate({ collab, formulario })
    onOpenChange(false)
    reset(vacio)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset(vacio)
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Nueva collab</DialogTitle>
          <DialogDescription>{modo === "yo" ? "Lo justo para empezar: las piezas se ajustan después en Contenidos y el brief, arriba en la collab." : "La marca recibe un enlace sin cuenta para contar la campaña, añadir las piezas y subir los materiales. Te llega todo a esta collab."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(crear)} noValidate className="grid gap-4">
          <Controller
            control={control}
            name="modo"
            render={({ field }) => (
              <Tabs value={field.value} onValueChange={(v) => field.onChange(v === "marca" ? "marca" : "yo")}>
                <TabsList className="w-full sm:w-fit">
                  <TabsTrigger value="yo"><FilePenLineIcon /> La relleno yo</TabsTrigger>
                  <TabsTrigger value="marca"><SendIcon /> Pedir el brief a la marca</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
            <Field data-invalid={!!errors.marcaId || undefined}>
              <FieldLabel htmlFor="nc-marca">Marca</FieldLabel>
              <Controller
                control={control}
                name="marcaId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      const principal = contactos.filter((c) => c.marcaId === v).find((c) => c.principal) ?? contactos.find((c) => c.marcaId === v)
                      setValue("contactoId", principal?.id ?? OTRA)
                      setValue("para", { nombre: principal?.nombre ?? "", email: principal?.email ?? "" })
                      setValue("mensaje", mensajePorDefecto(principal?.nombre ?? ""))
                    }}
                  >
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
            <Field data-invalid={!!errors.campana || undefined}>
              <FieldLabel htmlFor="nc-campana">Campaña</FieldLabel>
              <Input id="nc-campana" placeholder="Lanzamiento de otoño" aria-invalid={!!errors.campana} {...register("campana")} />
              <FieldError errors={[errors.campana]} />
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

          {modo === "yo" ? (
            <Field data-invalid={!!errors.piezas || undefined}>
              <FieldLabel>Piezas</FieldLabel>
              <Controller control={control} name="piezas" render={({ field }) => <PiezasEditor value={field.value} onChange={field.onChange} errores={errors.piezas?.map?.((e) => e?.titulo?.message)} ventana={{ desde, hasta }} />} />
              <FieldError errors={[errors.piezas?.root ?? (errors.piezas?.message ? errors.piezas : undefined)]} />
            </Field>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="nc-contacto">Para</FieldLabel>
                  <Controller
                    control={control}
                    name="contactoId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={elegirContacto} disabled={!marcaId}>
                        <SelectTrigger id="nc-contacto" className="w-full">
                          <SelectValue placeholder="Elige la persona" />
                        </SelectTrigger>
                        <SelectContent>
                          {deLaMarca.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                          <SelectItem value={OTRA}>Otra persona</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field data-invalid={!!errors.para?.nombre || undefined}>
                  <FieldLabel htmlFor="nc-para-nombre">Nombre</FieldLabel>
                  <Input id="nc-para-nombre" placeholder="Clara Benet" aria-invalid={!!errors.para?.nombre} {...register("para.nombre")} />
                  <FieldError errors={[errors.para?.nombre]} />
                </Field>
                <Field data-invalid={!!errors.para?.email || undefined}>
                  <FieldLabel htmlFor="nc-para-email">Email</FieldLabel>
                  <Input id="nc-para-email" type="email" placeholder="nombre@marca.com" aria-invalid={!!errors.para?.email} {...register("para.email")} />
                  <FieldError errors={[errors.para?.email]} />
                </Field>
              </div>
              <Field>
                <FieldLabel>Qué le pides</FieldLabel>
                <Controller
                  control={control}
                  name="alcance"
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={(v) => field.onChange(v === "materiales" ? "materiales" : "brief")} className="grid gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-soft">
                        <RadioGroupItem value="brief" className="mt-0.5" />
                        <span className="text-sm">
                          <span className="font-medium">El brief completo</span>
                          <span className="block text-xs text-muted-foreground">La campaña, las piezas, los materiales y sus datos de facturación.</span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-soft">
                        <RadioGroupItem value="materiales" className="mt-0.5" />
                        <span className="text-sm">
                          <span className="font-medium">Solo los materiales</span>
                          <span className="block text-xs text-muted-foreground">Logos, fotos del producto, guía de claims.</span>
                        </span>
                      </label>
                    </RadioGroup>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="nc-mensaje">Mensaje</FieldLabel>
                <Textarea id="nc-mensaje" rows={3} {...register("mensaje")} />
                <FieldDescription>Sale arriba del formulario y en el WhatsApp o el email con el enlace.</FieldDescription>
              </Field>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{modo === "yo" ? "Crear collab" : <><SendIcon /> Crear y preparar el enlace</>}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
