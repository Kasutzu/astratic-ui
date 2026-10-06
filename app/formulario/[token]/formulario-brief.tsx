"use client"

import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDownIcon, SendIcon } from "lucide-react"
import { cn } from "cn"
import type { Collab } from "@/lib/influencer/modelo"
import { z } from "zod"
import { PIEZA_VACIA, esquemaFormularioBrief, esquemaPiezaPedida, type FormularioBrief } from "@/lib/influencer/formularios"
import { textoPlano } from "@/lib/influencer/guion"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PiezasEditor } from "@/components/influencer/piezas-editor"
import { MaterialesMarca, SIN_MATERIALES, type MaterialesEnviados } from "./materiales-marca"

/** Un paso numerado del formulario, como en el formulario de clientes de Feedback. */
export function Paso({ numero, titulo, ayuda, opcional, children }: { numero: number; titulo: string; ayuda?: string; opcional?: boolean; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b px-5 py-6 last:border-b-0 md:grid-cols-[36px_minmax(0,1fr)] md:px-8">
      <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">{numero}</span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">
          {titulo} {opcional && <span className="text-sm font-normal text-muted-foreground">· opcional</span>}
        </h2>
        {ayuda && <p className="mt-0.5 text-sm text-muted-foreground">{ayuda}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}

const AYUDA_BRIEF = "Objetivo de la campaña\nMensajes clave\nClaims que sí se pueden decir y los que no\nLo que hay que hacer y lo que hay que evitar"

/**
 * El brief que rellena la marca, rápido: quién es, la campaña en un texto, las piezas («Añadir
 * pieza»: tipo y nombre, sin formatos cerrados), lo que se usa al publicar, los materiales y los datos
 * para facturar. Solo la campaña y una pieza son obligatorias.
 */
export function FormularioBriefMarca({ collab, influencer, onEnviar }: { collab: Collab; influencer: string; onEnviar: (v: FormularioBrief, materiales: MaterialesEnviados) => void }) {
  const [materiales, setMateriales] = React.useState<MaterialesEnviados>(SIN_MATERIALES)
  const [mas, setMas] = React.useState(false)
  const inicial: FormularioBrief = {
    contacto: collab.brief.contacto,
    campana: collab.campana,
    texto: textoPlano(collab.brief.texto),
    desde: collab.desde,
    hasta: collab.hasta,
    piezas: collab.piezas.length ? [] : [{ ...PIEZA_VACIA, publicacion: collab.hasta }],
    menciones: collab.brief.menciones.join(" "),
    hashtags: collab.brief.hashtags.join(" "),
    enlace: collab.brief.enlace ?? "",
    codigo: collab.brief.codigo ?? "",
    derechosUso: collab.brief.derechosUso ?? "",
    exclusividad: collab.brief.exclusividad ?? "",
    facturacion: { razonSocial: collab.facturacion?.razonSocial ?? "", nif: collab.facturacion?.nif ?? "", direccion: collab.facturacion?.direccion ?? "", email: collab.facturacion?.email ?? "", pedido: collab.facturacion?.pedido ?? "" },
  }
  // Si la collab ya tiene piezas, la marca no está obligada a añadir más.
  const esquema = collab.piezas.length ? esquemaFormularioBrief.extend({ piezas: z.array(esquemaPiezaPedida) }) : esquemaFormularioBrief
  const { register, handleSubmit, control, formState } = useForm<FormularioBrief>({ resolver: zodResolver(esquema), defaultValues: inicial })
  const { errors } = formState
  const [desde, hasta] = useWatch({ control, name: ["desde", "hasta"] })

  return (
    <form onSubmit={handleSubmit((v) => onEnviar(v, materiales))} noValidate className="overflow-hidden rounded-2xl bg-card shadow-card">
      <Paso numero={1} titulo="Tus datos" ayuda={`Para que ${influencer} sepa con quién habla.`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.contacto?.nombre || undefined}>
            <FieldLabel htmlFor="fm-nombre">Nombre y apellidos</FieldLabel>
            <Input id="fm-nombre" autoComplete="name" aria-invalid={!!errors.contacto?.nombre} {...register("contacto.nombre")} />
            <FieldError errors={[errors.contacto?.nombre]} />
          </Field>
          <Field data-invalid={!!errors.contacto?.email || undefined}>
            <FieldLabel htmlFor="fm-email">Email</FieldLabel>
            <Input id="fm-email" type="email" autoComplete="email" aria-invalid={!!errors.contacto?.email} {...register("contacto.email")} />
            <FieldError errors={[errors.contacto?.email]} />
          </Field>
        </div>
      </Paso>

      <Paso numero={2} titulo="La campaña" ayuda="Cuéntalo como lo contarías en un email: no hace falta formato.">
        <div className="grid gap-4">
          <Field data-invalid={!!errors.campana || undefined}>
            <FieldLabel htmlFor="fm-campana">Nombre de la campaña</FieldLabel>
            <Input id="fm-campana" aria-invalid={!!errors.campana} {...register("campana")} />
            <FieldError errors={[errors.campana]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="fm-texto">El brief</FieldLabel>
            <Textarea id="fm-texto" rows={7} placeholder={AYUDA_BRIEF} {...register("texto")} />
            <FieldDescription>Si lo tienes en PDF, súbelo en el paso 4 y aquí deja solo lo esencial.</FieldDescription>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fm-desde">Se publica desde</FieldLabel>
              <Input id="fm-desde" type="date" {...register("desde")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="fm-hasta">Hasta</FieldLabel>
              <Input id="fm-hasta" type="date" {...register("hasta")} />
            </Field>
          </div>
        </div>
      </Paso>

      <Paso numero={3} titulo="Las piezas" ayuda="Añade cada pieza con su tipo y un nombre que la identifique. La fecha, si ya la sabéis.">
        <Controller control={control} name="piezas" render={({ field }) => <PiezasEditor value={field.value} onChange={field.onChange} errores={Array.isArray(errors.piezas) ? errors.piezas.map((e) => e?.titulo?.message) : undefined} ventana={{ desde, hasta }} />} />
        <FieldError errors={[errors.piezas?.root ?? (errors.piezas?.message ? errors.piezas : undefined)]} className="mt-2" />
        {collab.piezas.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Ya hay {collab.piezas.length} piezas en la collab: lo que añadas aquí se suma.</p>}
      </Paso>

      <Paso numero={4} titulo="Materiales" ayuda="Lo que necesita para grabar: logos, fotos del producto, la guía de claims." opcional>
        <MaterialesMarca value={materiales} onChange={setMateriales} />
      </Paso>

      <section className="border-b px-5 py-4 md:px-8">
        <button type="button" onClick={() => setMas((m) => !m)} aria-expanded={mas} className="flex w-full items-center gap-2 text-left text-sm font-medium">
          <ChevronDownIcon className={cn("size-4 transition-transform", mas && "rotate-180")} />
          Al publicar y facturar · opcional
          <span className="font-normal text-muted-foreground">menciones, hashtags, código, derechos y datos de facturación</span>
        </button>
      </section>
      {mas && (
        <>
          <Paso numero={5} titulo="Al publicar" opcional>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fm-menciones">Menciones</FieldLabel>
                <Input id="fm-menciones" placeholder="@marca" {...register("menciones")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="fm-hashtags">Hashtags</FieldLabel>
                <Input id="fm-hashtags" placeholder="#publi #campaña" {...register("hashtags")} />
              </Field>
              <Field data-invalid={!!errors.enlace || undefined}>
                <FieldLabel htmlFor="fm-enlace">Enlace de la campaña</FieldLabel>
                <Input id="fm-enlace" type="url" placeholder="https://" aria-invalid={!!errors.enlace} {...register("enlace")} />
                <FieldError errors={[errors.enlace]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="fm-codigo">Código de descuento</FieldLabel>
                <Input id="fm-codigo" placeholder="MARTA15" {...register("codigo")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="fm-derechos">Derechos de uso</FieldLabel>
                <Input id="fm-derechos" placeholder="Orgánico · 6 meses" {...register("derechosUso")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="fm-exclusividad">Exclusividad</FieldLabel>
                <Input id="fm-exclusividad" placeholder="Skincare · 2 meses" {...register("exclusividad")} />
              </Field>
            </div>
          </Paso>
          <Paso numero={6} titulo="Datos para la factura" opcional>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fm-razon">Razón social</FieldLabel>
                <Input id="fm-razon" {...register("facturacion.razonSocial")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="fm-nif">NIF</FieldLabel>
                <Input id="fm-nif" {...register("facturacion.nif")} />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="fm-direccion">Dirección fiscal</FieldLabel>
                <Input id="fm-direccion" {...register("facturacion.direccion")} />
              </Field>
              <Field data-invalid={!!errors.facturacion?.email || undefined}>
                <FieldLabel htmlFor="fm-email-fact">Email para facturas</FieldLabel>
                <Input id="fm-email-fact" type="email" aria-invalid={!!errors.facturacion?.email} {...register("facturacion.email")} />
                <FieldError errors={[errors.facturacion?.email]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="fm-pedido">Número de pedido</FieldLabel>
                <Input id="fm-pedido" placeholder="Si lo pedís en la factura" {...register("facturacion.pedido")} />
              </Field>
            </div>
          </Paso>
        </>
      )}

      <footer className="flex flex-wrap items-center gap-3 bg-muted/40 px-5 py-4 md:px-8">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">Al enviarlo, {influencer} recibe un aviso y lo tiene todo en la collab. Podrás volver a este enlace si cambia algo.</p>
        <Button type="submit" size="lg">
          <SendIcon /> Enviar a {influencer}
        </Button>
      </footer>
    </form>
  )
}
