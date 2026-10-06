"use client"

import * as React from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2Icon, DownloadIcon, KanbanSquareIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { CONDICIONES_POR_DEFECTO, EXTRAS, FORMATOS, LISTA_FORMATOS, describirPiezas, type ExtraId, type LineaPresupuesto, type Marca, type Presupuesto, type Propuesta } from "@/lib/influencer/modelo"
import { calcularPresupuesto, lineasDesdePiezas, tarifaDe } from "@/lib/influencer/presupuesto"
import { tintFor } from "@/lib/influencer/tints"
import { idNuevo } from "@/lib/influencer/tareas"
import { sumarDias } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCrm } from "./crm-provider"
import { EscribirMensaje } from "./escribir"

const NUEVA = "__nueva__"
const NADIE = "__nadie__"
const numero = (msg = "Escribe un número") => z.number({ error: msg })

const esquema = z
  .object({
    esNueva: z.boolean(),
    marcaId: z.string(),
    nombreMarca: z.string().trim().max(60),
    contactoId: z.string(),
    campana: z.string().trim().max(80),
    lineas: z.array(z.object({ formato: z.enum(LISTA_FORMATOS), cantidad: numero().int().min(1, "Mínimo 1").max(50), precio: numero().min(0, "Sin negativos") })).min(1, "Añade al menos una línea"),
    extras: z.array(z.enum(EXTRAS.map((e) => e.id))),
    conPrecios: z.boolean(),
    rondas: numero().int().min(0).max(10),
    validez: numero().int().min(1, "Mínimo un día").max(90),
    pago: z.string().trim().min(1, "Di cuándo se cobra").max(80),
    condiciones: z.string().trim().max(600),
  })
  .refine((v) => !v.esNueva || v.marcaId !== "", { message: "Elige la marca", path: ["marcaId"] })
  .refine((v) => !v.esNueva || v.marcaId !== NUEVA || v.nombreMarca.length > 0, { message: "Escribe el nombre de la marca", path: ["nombreMarca"] })
  .refine((v) => !v.esNueva || v.campana.length > 0, { message: "Ponle nombre a la campaña", path: ["campana"] })

type Valores = z.infer<typeof esquema>

/**
 * Preparar una propuesta: el presupuesto con sus tarifas, los extras que suben el fee y las
 * condiciones; después, mandarla (PDF o email con plantilla). Sin `propuesta` es una propuesta
 * nueva (desde el media kit) y pide también la marca, la persona y la campaña.
 */
export function PrepararPropuestaDialog({ open, propuesta, onOpenChange, onVerEnPipeline }: { open: boolean; propuesta?: Propuesta | null; onOpenChange: (open: boolean) => void; onVerEnPipeline?: (id: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
        {open && <Contenido propuesta={propuesta ?? null} onClose={() => onOpenChange(false)} onVerEnPipeline={onVerEnPipeline} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({ propuesta, onClose, onVerEnPipeline }: { propuesta: Propuesta | null; onClose: () => void; onVerEnPipeline?: (id: string) => void }) {
  const { perfil, marcas, contactos, hoy, setMarcas, setPropuestas, publicarDocumento, actualizarPropuesta } = useCrm()
  const tarifas = perfil.tarifas
  const [lista, setLista] = React.useState<Propuesta | null>(null)
  const p = propuesta?.presupuesto
  const { register, control, handleSubmit, setValue, formState } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      esNueva: !propuesta,
      marcaId: propuesta?.marcaId ?? "",
      nombreMarca: "",
      contactoId: propuesta?.contactoId ?? NADIE,
      campana: propuesta?.campana ?? "",
      lineas: p?.lineas ?? (propuesta ? lineasDesdePiezas(propuesta.piezas, tarifas) : lineasDesdePiezas([{ formato: "reel", cantidad: 1 }], tarifas)),
      extras: p?.extras ?? [],
      conPrecios: p?.conPrecios ?? true,
      rondas: p?.rondas ?? CONDICIONES_POR_DEFECTO.rondas,
      validez: p?.validez ?? CONDICIONES_POR_DEFECTO.validez,
      pago: p?.pago ?? (propuesta?.origen === "red" ? "Factura Astratic" : CONDICIONES_POR_DEFECTO.pago),
      condiciones: p?.condiciones ?? "",
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "lineas" })
  const { errors } = formState
  const valores = useWatch({ control })
  const marcaId = valores.marcaId ?? ""

  // Mientras se escribe, el formulario puede tener huecos: se calcula con lo que ya es un número.
  const lineasActuales: LineaPresupuesto[] = (valores.lineas ?? []).map((l) => ({ formato: l?.formato ?? "reel", cantidad: Number(l?.cantidad) || 0, precio: Number(l?.precio) || 0 }))
  const extrasActuales = (valores.extras ?? []).filter((e): e is ExtraId => e !== undefined)
  const calculo = calcularPresupuesto({ lineas: lineasActuales, extras: extrasActuales }, tarifas)
  const ofrecen = propuesta?.ofrecen
  const marcaActual = propuesta ? marcas.find((m) => m.id === propuesta.marcaId) : marcas.find((m) => m.id === marcaId)

  const guardar = (v: Valores) => {
    const presupuesto: Presupuesto = { lineas: v.lineas, extras: v.extras, conPrecios: v.conPrecios, rondas: v.rondas, validez: v.validez, pago: v.pago, condiciones: v.condiciones || undefined, generadoEl: hoy }
    let resultado: Propuesta
    if (propuesta) {
      resultado = { ...propuesta, presupuesto, estado: propuesta.estado === "nueva" ? "hablando" : propuesta.estado }
      setPropuestas((ps) => ps.map((x) => (x.id === resultado.id ? resultado : x)))
    } else {
      let idMarca = v.marcaId
      if (v.marcaId === NUEVA) {
        const marca: Marca = { id: idNuevo("m"), nombre: v.nombreMarca, sector: "", tint: tintFor(v.nombreMarca), atribucion: "propia", atribucionHasta: sumarDias(hoy, 365), creadaEl: hoy }
        idMarca = marca.id
        setMarcas((ms) => [...ms, marca])
      }
      resultado = { id: idNuevo("p"), marcaId: idMarca, contactoId: v.contactoId && v.contactoId !== NADIE ? v.contactoId : undefined, campana: v.campana, estado: "hablando", origen: "propia", piezas: v.lineas.map((l) => ({ formato: l.formato, cantidad: l.cantidad })), presupuesto, ultimoContacto: hoy, creadaEl: hoy }
      setPropuestas((ps) => [resultado, ...ps])
    }
    publicarDocumento(resultado)
    setLista(resultado)
  }

  /** Mandarla (PDF o email) la deja en «Enviada» si aún no había llegado ahí. */
  const marcarEnviada = (x: Propuesta) => {
    if (x.estado === "nueva" || x.estado === "hablando") actualizarPropuesta(x.id, { estado: "enviada", ultimoContacto: hoy })
  }

  const marcaDeLista = lista ? marcas.find((m) => m.id === lista.marcaId) : undefined
  if (lista && marcaDeLista) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-success" /> Propuesta lista para {marcaDeLista.nombre}
          </DialogTitle>
          <DialogDescription>
            {describirPiezas(lista.presupuesto?.lineas ?? lista.piezas)} por {fmt.eur(calcularPresupuesto(lista.presupuesto ?? { lineas: [], extras: [] }, tarifas).total)}. Descárgala en PDF o mándala por email con tu plantilla.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              marcarEnviada(lista)
              window.open(`/propuesta/${lista.id}`, "_blank", "noopener")
            }}
          >
            <DownloadIcon /> Descargar PDF
          </Button>
          {onVerEnPipeline && (
            <Button variant="outline" onClick={() => onVerEnPipeline(lista.id)}>
              <KanbanSquareIcon /> Ver en el pipeline
            </Button>
          )}
        </div>
        <div className="border-t pt-4">
          <EscribirMensaje
            marca={marcaDeLista}
            propuesta={lista}
            uso="propuesta"
            contactoInicial={lista.contactoId}
            onHecho={() => {
              marcarEnviada(lista)
              onClose()
            }}
            pie={(acciones) => <DialogFooter className="items-center sm:justify-end">{acciones}</DialogFooter>}
          />
        </div>
      </>
    )
  }

  const deLaMarca = contactos.filter((c) => c.marcaId === marcaId)

  return (
    <>
      <DialogHeader>
        <DialogTitle>{propuesta ? `Preparar propuesta para ${marcaActual?.nombre ?? ""}` : "Nueva propuesta"}</DialogTitle>
        <DialogDescription>Tus tarifas, los extras y las condiciones en un documento con tu media kit. Después la descargas en PDF o la mandas por email.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(guardar)} noValidate className="grid gap-5">
        {!propuesta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.marcaId || undefined}>
              <FieldLabel htmlFor="pp-marca">Marca</FieldLabel>
              <Controller
                control={control}
                name="marcaId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      const deEsa = contactos.filter((c) => c.marcaId === v)
                      setValue("contactoId", (deEsa.find((c) => c.principal) ?? deEsa[0])?.id ?? NADIE)
                    }}
                  >
                    <SelectTrigger id="pp-marca" className="w-full" aria-invalid={!!errors.marcaId}>
                      <SelectValue placeholder="Elige o crea una" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
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
                <FieldLabel htmlFor="pp-nombre">Nombre de la marca</FieldLabel>
                <Input id="pp-nombre" autoFocus aria-invalid={!!errors.nombreMarca} {...register("nombreMarca")} />
                <FieldError errors={[errors.nombreMarca]} />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="pp-persona">Para</FieldLabel>
                <Controller
                  control={control}
                  name="contactoId"
                  render={({ field }) => (
                    // Se vuelve a montar con cada marca: si las opciones cambian con el selector montado, Radix lo vacía.
                    <Select key={marcaId} value={field.value} onValueChange={field.onChange} disabled={!marcaId}>
                      <SelectTrigger id="pp-persona" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {deLaMarca.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` · ${c.cargo}` : ""}</SelectItem>
                        ))}
                        <SelectItem value={NADIE}>Sin persona concreta</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
            <Field data-invalid={!!errors.campana || undefined} className="sm:col-span-2">
              <FieldLabel htmlFor="pp-campana">Campaña</FieldLabel>
              <Input id="pp-campana" placeholder="Rutina de otoño" aria-invalid={!!errors.campana} {...register("campana")} />
              <FieldError errors={[errors.campana]} />
            </Field>
          </div>
        )}

        <Field data-invalid={!!errors.lineas || undefined}>
          <FieldLabel>Piezas y precio</FieldLabel>
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
                            <SelectItem key={fo} value={fo}>{FORMATOS[fo].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input type="number" min={1} aria-label="Cantidad" className="h-8 px-2 tabular-nums" {...register(`lineas.${i}.cantidad`, { valueAsNumber: true })} />
                  <div className="relative">
                    <Input type="number" min={0} step={10} aria-label="Precio por pieza" className="h-8 pr-6 pl-2 tabular-nums" {...register(`lineas.${i}.precio`, { valueAsNumber: true })} />
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
                {EXTRAS.map((e) => (
                  <label key={e.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-soft">
                    <Checkbox checked={field.value.includes(e.id)} onCheckedChange={(c) => field.onChange(c ? [...field.value, e.id] : field.value.filter((x) => x !== e.id))} className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="font-medium">
                        {e.label} <span className="text-muted-foreground">+{Math.round(e.recargo * 100)} %</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{e.descripcion}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[96px_96px_1fr]">
          <Field data-invalid={!!errors.rondas || undefined}>
            <FieldLabel htmlFor="pp-rondas">Rondas</FieldLabel>
            <Input id="pp-rondas" type="number" min={0} max={10} className="tabular-nums" {...register("rondas", { valueAsNumber: true })} />
            <FieldError errors={[errors.rondas]} />
          </Field>
          <Field data-invalid={!!errors.validez || undefined}>
            <FieldLabel htmlFor="pp-validez">Validez (días)</FieldLabel>
            <Input id="pp-validez" type="number" min={1} max={90} className="tabular-nums" {...register("validez", { valueAsNumber: true })} />
            <FieldError errors={[errors.validez]} />
          </Field>
          <Field data-invalid={!!errors.pago || undefined}>
            <FieldLabel htmlFor="pp-pago">Pago</FieldLabel>
            <Input id="pp-pago" placeholder="30 días tras publicar" {...register("pago")} />
            <FieldError errors={[errors.pago]} />
          </Field>
        </div>
        <Field data-invalid={!!errors.condiciones || undefined}>
          <FieldLabel htmlFor="pp-condiciones">Condiciones para esta marca</FieldLabel>
          <Textarea id="pp-condiciones" rows={2} placeholder={"Una por línea: «El producto llega antes del día 15»"} {...register("condiciones")} />
          <FieldError errors={[errors.condiciones]} />
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
            <span>Total (IVA aparte)</span>
            <span className="tabular-nums">{fmt.eur(calculo.total)}</span>
          </div>
          {(calculo.bajoMinimo || (ofrecen !== undefined && ofrecen > 0 && ofrecen < calculo.minimo)) && (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-warning">
              <TriangleAlertIcon className="mt-px size-3.5 flex-none" />
              {calculo.bajoMinimo ? `Por debajo de tu mínimo pactado para estas piezas (${fmt.eur(calculo.minimo)}).` : `La marca ofrece ${fmt.eur(ofrecen ?? 0)}: por debajo de tu mínimo (${fmt.eur(calculo.minimo)}). Tu presupuesto va por ${fmt.eur(calculo.total)}.`}
            </p>
          )}
        </div>

        <Controller
          control={control}
          name="conPrecios"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="grid gap-0.5">
                <span className="font-medium">Media kit con tarifas de salida</span>
                <span className="text-xs text-muted-foreground">El resto del media kit va como lo tengas en la pestaña «Media kit»; los precios, si quieres.</span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar y mandar</Button>
        </DialogFooter>
      </form>
    </>
  )
}
