"use client"

import * as React from "react"
import { SendIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import type { AlcanceFormulario, FormularioMarca } from "@/lib/influencer/modelo"
import { caducidad, tokenNuevo } from "@/lib/influencer/formularios"
import { idNuevo } from "@/lib/influencer/tareas"
import { guardarBorrador } from "@/lib/influencer/borradores"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CompartirEnlace } from "@/components/influencer/compartir-enlace"
import { useCollab } from "./collab-provider"

const MENSAJES: Record<AlcanceFormulario, (nombre: string) => string> = {
  brief: (n) => `Hola${n ? ` ${n.split(" ")[0]}` : ""}: aquí puedes contarme la campaña, añadir las piezas y subir los materiales. Así lo tengo todo en un sitio.`,
  materiales: (n) => `Hola${n ? ` ${n.split(" ")[0]}` : ""}: ¿me subes aquí los materiales de la campaña (logos, fotos del producto, guía de claims)?`,
}

/**
 * Pedir a la marca el brief entero o solo los materiales: un enlace sin cuenta con su formulario.
 * Primero a quién y con qué mensaje; después, el enlace listo para mandar.
 */
export function PedirFormularioDialog({ open, onOpenChange, alcance }: { open: boolean; onOpenChange: (o: boolean) => void; alcance: AlcanceFormulario }) {
  const { collab, marca, hoy, formularios } = useCollab()
  const [, setFormularios] = formularios
  const [para, setPara] = React.useState(collab.brief.contacto)
  const [mensaje, setMensaje] = React.useState(MENSAJES[alcance](collab.brief.contacto.nombre))
  const [creado, setCreado] = React.useState<FormularioMarca | null>(null)
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para.email)

  const cerrar = (o: boolean) => {
    onOpenChange(o)
    if (!o) {
      setCreado(null)
      setPara(collab.brief.contacto)
      setMensaje(MENSAJES[alcance](collab.brief.contacto.nombre))
    }
  }

  const crear = () => {
    const formulario: FormularioMarca = { id: idNuevo("fm"), token: tokenNuevo("fm"), collabId: collab.id, alcance, para, mensaje: mensaje.trim() || undefined, creadoEl: hoy, caduca: caducidad(hoy) }
    setFormularios((fs) => [formulario, ...fs])
    // Solo en este repo: el formulario de la otra pestaña lee la collab del navegador.
    guardarBorrador(`formulario:${formulario.token}`, { registro: formulario, collab, marca })
    setCreado(formulario)
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{alcance === "brief" ? "Pedir el brief a la marca" : "Pedir los materiales a la marca"}</DialogTitle>
          <DialogDescription>
            {creado
              ? `Listo. Mándaselo a ${creado.para.nombre}: lo rellena sin cuenta y te llega a esta collab. Caduca el ${fmt.date(creado.caduca)}.`
              : alcance === "brief"
                ? "Un formulario rápido: la campaña, las piezas que necesitan («Añadir pieza»), los materiales y sus datos de facturación."
                : "Un formulario solo para subir archivos y enlaces: logos, fotos del producto, guía de claims."}
          </DialogDescription>
        </DialogHeader>
        {creado ? (
          <CompartirEnlace ruta={`/formulario/${creado.token}`} mensaje={creado.mensaje ?? ""} asunto={`${collab.campana} · ${alcance === "brief" ? "brief" : "materiales"} para ${marca.nombre}`} email={creado.para.email} verComo="Ver el formulario" />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pf-nombre">Para</FieldLabel>
                <Input id="pf-nombre" value={para.nombre} onChange={(e) => setPara({ ...para, nombre: e.target.value })} placeholder="Nombre" />
              </Field>
              <Field data-invalid={(para.email !== "" && !emailValido) || undefined}>
                <FieldLabel htmlFor="pf-email">Email</FieldLabel>
                <Input id="pf-email" type="email" value={para.email} onChange={(e) => setPara({ ...para, email: e.target.value })} placeholder="nombre@marca.com" aria-invalid={para.email !== "" && !emailValido} />
                {para.email !== "" && !emailValido && <FieldError errors={[{ message: "Revisa el email" }]} />}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="pf-mensaje">Mensaje</FieldLabel>
              <Textarea id="pf-mensaje" rows={3} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
            </Field>
          </div>
        )}
        <DialogFooter>
          {creado ? (
            <Button onClick={() => cerrar(false)}>Hecho</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => cerrar(false)}>
                Cancelar
              </Button>
              <Button onClick={crear} disabled={!para.nombre.trim() || !emailValido}>
                <SendIcon /> Crear el enlace
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
