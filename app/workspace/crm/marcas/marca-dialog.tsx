"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Contacto, Marca } from "@/lib/influencer/modelo"
import { tintFor } from "@/lib/influencer/tints"
import { idNuevo } from "@/lib/influencer/tareas"
import { sumarDias } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCrm } from "../crm-provider"

const esquema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre").max(60),
  sector: z.string().trim().max(60),
  web: z.union([z.literal(""), z.url("Escribe una web completa, con https://")]),
  instagram: z.string().trim().max(60),
  atribucion: z.enum(["propia", "red"]),
  persona: z.string().trim().max(80),
  cargo: z.string().trim().max(80),
  email: z.union([z.literal(""), z.email("Ese email no es válido")]),
  notas: z.string().trim().max(500),
})

type Valores = z.infer<typeof esquema>

/** Alta de una marca y, si ya la sabes, de la persona con la que hablas. */
export function MarcaDialog({ open, onOpenChange, onCreada }: { open: boolean; onOpenChange: (open: boolean) => void; onCreada: (marca: Marca) => void }) {
  const { hoy, marcas, setMarcas, setContactos } = useCrm()
  const { register, handleSubmit, control, reset, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: "", sector: "", web: "", instagram: "", atribucion: "propia", persona: "", cargo: "", email: "", notas: "" },
  })
  const { errors } = formState

  React.useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const crear = (v: Valores) => {
    if (marcas.some((m) => m.nombre.toLowerCase() === v.nombre.toLowerCase())) {
      setError("nombre", { message: "Ya tienes una marca con ese nombre" })
      return
    }
    const marca: Marca = {
      id: idNuevo("m"),
      nombre: v.nombre,
      sector: v.sector,
      web: v.web || undefined,
      instagram: v.instagram.replace(/^@/, "") || undefined,
      tint: tintFor(v.nombre),
      atribucion: v.atribucion,
      atribucionHasta: v.atribucion === "propia" ? sumarDias(hoy, 365) : undefined,
      notas: v.notas || undefined,
      creadaEl: hoy,
    }
    setMarcas((ms) => [...ms, marca])
    if (v.persona) {
      const contacto: Contacto = { id: idNuevo("c"), marcaId: marca.id, nombre: v.persona, cargo: v.cargo || undefined, email: v.email || undefined, principal: true, creadoEl: hoy }
      setContactos((cs) => [...cs, contacto])
    }
    onCreada(marca)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nueva marca</DialogTitle>
          <DialogDescription>Las marcas que te escriben y las que quieres trabajar. Si es tuya, queda a tu nombre 12 meses.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(crear)} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.nombre || undefined}>
              <FieldLabel htmlFor="nm-nombre">Nombre</FieldLabel>
              <Input id="nm-nombre" autoFocus aria-invalid={!!errors.nombre} {...register("nombre")} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="nm-sector">Sector</FieldLabel>
              <Input id="nm-sector" placeholder="Skincare, maquillaje…" {...register("sector")} />
            </Field>
            <Field data-invalid={!!errors.web || undefined}>
              <FieldLabel htmlFor="nm-web">Web</FieldLabel>
              <Input id="nm-web" type="url" placeholder="https://" aria-invalid={!!errors.web} {...register("web")} />
              <FieldError errors={[errors.web]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="nm-ig">Instagram</FieldLabel>
              <Input id="nm-ig" placeholder="usuario" {...register("instagram")} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="nm-atribucion">De quién es</FieldLabel>
            <Controller
              control={control}
              name="atribucion"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="nm-atribucion" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="propia">Mía: la he traído yo</SelectItem>
                    <SelectItem value="red">De la red Astratic</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>Las tuyas se facturan como tú quieras; las de la red las factura Astratic y cobras el 80 %.</FieldDescription>
          </Field>
          <div className="grid gap-4 rounded-xl border border-dashed p-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="nm-persona">Persona</FieldLabel>
              <Input id="nm-persona" placeholder="Opcional" {...register("persona")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="nm-cargo">Cargo</FieldLabel>
              <Input id="nm-cargo" {...register("cargo")} />
            </Field>
            <Field data-invalid={!!errors.email || undefined}>
              <FieldLabel htmlFor="nm-email">Email</FieldLabel>
              <Input id="nm-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="nm-notas">Notas</FieldLabel>
            <Textarea id="nm-notas" rows={2} placeholder="«Pagan tarde», «piden el guion antes»…" {...register("notas")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Crear marca</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
