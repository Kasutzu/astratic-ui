"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Contacto } from "@/lib/influencer/modelo"
import { idNuevo } from "@/lib/influencer/tareas"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCrm } from "../crm-provider"

const esquema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre").max(80),
  marcaId: z.string().min(1, "Elige la marca"),
  cargo: z.string().trim().max(80),
  email: z.union([z.literal(""), z.email("Ese email no es válido")]),
  telefono: z.string().trim().max(30),
  instagram: z.string().trim().max(60),
  principal: z.boolean(),
  notas: z.string().trim().max(500),
})

type Valores = z.infer<typeof esquema>

/** Alta de una persona de una marca. Con `marcaFija` (desde la ficha de la marca) no se elige marca. */
export function ContactoDialog({ open, onOpenChange, marcaFija, onCreado }: { open: boolean; onOpenChange: (open: boolean) => void; marcaFija?: string; onCreado?: (c: Contacto) => void }) {
  const { hoy, marcas, contactos, setContactos } = useCrm()
  const { register, handleSubmit, control, reset, formState } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: "", marcaId: marcaFija ?? "", cargo: "", email: "", telefono: "", instagram: "", principal: false, notas: "" },
  })
  const { errors } = formState

  React.useEffect(() => {
    if (open) reset({ nombre: "", marcaId: marcaFija ?? "", cargo: "", email: "", telefono: "", instagram: "", principal: marcaFija ? !contactos.some((c) => c.marcaId === marcaFija) : false, notas: "" })
  }, [open, reset, marcaFija, contactos])

  const crear = (v: Valores) => {
    const contacto: Contacto = {
      id: idNuevo("c"),
      marcaId: v.marcaId,
      nombre: v.nombre,
      cargo: v.cargo || undefined,
      email: v.email || undefined,
      telefono: v.telefono || undefined,
      instagram: v.instagram.replace(/^@/, "") || undefined,
      principal: v.principal || !contactos.some((c) => c.marcaId === v.marcaId),
      notas: v.notas || undefined,
      creadoEl: hoy,
    }
    // Solo hay un principal por marca: el nuevo le quita la marca al anterior.
    setContactos((cs) => [...cs.map((c) => (contacto.principal && c.marcaId === v.marcaId ? { ...c, principal: false } : c)), contacto])
    onCreado?.(contacto)
    onOpenChange(false)
  }

  const nombreMarca = marcas.find((m) => m.id === marcaFija)?.nombre

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nuevo contacto{nombreMarca ? ` en ${nombreMarca}` : ""}</DialogTitle>
          <DialogDescription>Quién lleva las colaboraciones en la marca y cómo escribirle.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(crear)} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.nombre || undefined}>
              <FieldLabel htmlFor="nc-nombre">Nombre y apellidos</FieldLabel>
              <Input id="nc-nombre" autoFocus aria-invalid={!!errors.nombre} {...register("nombre")} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            {marcaFija ? (
              <Field>
                <FieldLabel htmlFor="nc-cargo">Cargo</FieldLabel>
                <Input id="nc-cargo" placeholder="Influencer marketing" {...register("cargo")} />
              </Field>
            ) : (
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
                        {[...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.marcaId]} />
              </Field>
            )}
            {!marcaFija && (
              <Field>
                <FieldLabel htmlFor="nc-cargo">Cargo</FieldLabel>
                <Input id="nc-cargo" placeholder="Influencer marketing" {...register("cargo")} />
              </Field>
            )}
            <Field data-invalid={!!errors.email || undefined}>
              <FieldLabel htmlFor="nc-email">Email</FieldLabel>
              <Input id="nc-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="nc-tel">Teléfono</FieldLabel>
              <Input id="nc-tel" type="tel" {...register("telefono")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="nc-ig">Instagram</FieldLabel>
              <Input id="nc-ig" placeholder="usuario" {...register("instagram")} />
            </Field>
          </div>
          <Controller
            control={control}
            name="principal"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                Es quien lleva la relación (contacto principal)
              </label>
            )}
          />
          <Field>
            <FieldLabel htmlFor="nc-notas">Notas</FieldLabel>
            <Textarea id="nc-notas" rows={2} placeholder="«Prefiere WhatsApp para lo rápido»" {...register("notas")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Crear contacto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
