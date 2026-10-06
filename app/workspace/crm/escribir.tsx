"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CopyIcon, MailIcon, TriangleAlertIcon } from "lucide-react"
import { CANALES_PLANTILLA, USOS_PLANTILLA, type CanalPlantilla, type Marca, type Plantilla, type Propuesta, type TipoInteraccion, type UsoPlantilla } from "@/lib/influencer/modelo"
import { contextoPlantilla, etiquetaVariable, rellenar, variablesSinValor } from "@/lib/influencer/plantillas"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOrigen } from "@/components/influencer/navegador"
import { useCrm } from "./crm-provider"

const SIN_CONTACTO = "__ninguno__"

const TIPO_DE_CANAL: Record<CanalPlantilla, TipoInteraccion> = { email: "email", dm: "dm", whatsapp: "whatsapp" }

/** Las plantillas por uso, con las del uso sugerido y las favoritas delante. */
function ordenar(plantillas: Plantilla[], uso?: UsoPlantilla) {
  return [...plantillas].sort((a, b) => Number(b.uso === uso) - Number(a.uso === uso) || Number(b.favorita) - Number(a.favorita) || b.usos - a.usos)
}

/**
 * Escribir a una marca con una plantilla: se elige la plantilla y la persona, las variables se
 * rellenan solas y el texto se retoca antes de copiarlo o abrirlo en el correo. Al terminar se
 * apunta en el seguimiento.
 */
export function EscribirMensaje({ marca, propuesta, uso, contactoInicial, onHecho, pie }: { marca: Marca; propuesta?: Propuesta | null; uso?: UsoPlantilla; contactoInicial?: string | null; onHecho?: () => void; pie?: (acciones: React.ReactNode) => React.ReactNode }) {
  const { plantillas, contactos, perfil, setPlantillas, apuntar, hoy } = useCrm()
  const origen = useOrigen()
  const deLaMarca = contactos.filter((c) => c.marcaId === marca.id)
  const ordenadas = ordenar(plantillas, uso)
  const [plantillaId, setPlantillaId] = React.useState(ordenadas[0]?.id ?? "")
  const [contactoId, setContactoId] = React.useState(contactoInicial || (deLaMarca.find((c) => c.principal)?.id ?? deLaMarca[0]?.id ?? SIN_CONTACTO))
  const [apuntarlo, setApuntarlo] = React.useState(true)
  // Lo retocado a mano vale mientras no se cambie de plantilla ni de persona.
  const [retoque, setRetoque] = React.useState<{ clave: string; asunto: string; cuerpo: string } | null>(null)

  const plantilla = plantillas.find((p) => p.id === plantillaId)
  const contacto = deLaMarca.find((c) => c.id === contactoId) ?? null
  const ctx = contextoPlantilla({ perfil, marca, contacto, propuesta, tarifas: perfil.tarifas, origen })
  const clave = `${plantillaId}:${contactoId}`
  const asunto = retoque?.clave === clave ? retoque.asunto : rellenar(plantilla?.asunto ?? "", ctx)
  const cuerpo = retoque?.clave === clave ? retoque.cuerpo : rellenar(plantilla?.cuerpo ?? "", ctx)
  const faltan = variablesSinValor(`${asunto}\n${cuerpo}`, ctx)
  const esEmail = plantilla?.canal === "email"

  const terminar = (como: string) => {
    if (!plantilla) return
    setPlantillas((ps) => ps.map((p) => (p.id === plantilla.id ? { ...p, usos: p.usos + 1, ultimoUso: hoy } : p)))
    if (apuntarlo) apuntar({ tipo: TIPO_DE_CANAL[plantilla.canal], sentido: "enviado", marcaId: marca.id, contactoId: contacto?.id, propuestaId: propuesta?.id, nota: `«${plantilla.nombre}»${como}` })
    onHecho?.()
  }

  const copiar = async () => {
    await navigator.clipboard.writeText(esEmail && asunto ? `${asunto}\n\n${cuerpo}` : cuerpo)
    toast.success(esEmail ? "Email copiado: pégalo en tu correo" : "Mensaje copiado")
    terminar("")
  }

  const abrirCorreo = () => {
    if (!contacto?.email) return
    window.location.assign(`mailto:${contacto.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`)
    terminar(" desde el correo")
  }

  if (plantillas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no tienes plantillas. <Link href="/workspace/crm/plantillas" className="font-medium text-foreground underline-offset-2 hover:underline">Crea la primera</Link> y aquí se rellenará sola.
      </p>
    )
  }

  const acciones = (
    <>
      <label className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox checked={apuntarlo} onCheckedChange={(c) => setApuntarlo(c === true)} />
        Apuntarlo en el seguimiento
      </label>
      {esEmail && contacto?.email && (
        <Button type="button" variant="outline" onClick={abrirCorreo}>
          <MailIcon /> Abrir en el correo
        </Button>
      )}
      <Button type="button" onClick={copiar} disabled={!plantilla}>
        <CopyIcon /> Copiar {esEmail ? "email" : "mensaje"}
      </Button>
    </>
  )

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="esc-plantilla">Plantilla</FieldLabel>
          <Select value={plantillaId} onValueChange={setPlantillaId}>
            <SelectTrigger id="esc-plantilla" className="w-full">
              <SelectValue placeholder="Elige una plantilla" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(USOS_PLANTILLA) as UsoPlantilla[])
                .sort((a, b) => Number(b === uso) - Number(a === uso))
                .map((u) => {
                  const delUso = ordenadas.filter((p) => p.uso === u)
                  if (delUso.length === 0) return null
                  return (
                    <SelectGroup key={u}>
                      <SelectLabel>{USOS_PLANTILLA[u]}</SelectLabel>
                      {delUso.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} <span className="text-muted-foreground">· {CANALES_PLANTILLA[p.canal]}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                })}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="esc-para">Para</FieldLabel>
          <Select value={contactoId} onValueChange={setContactoId}>
            <SelectTrigger id="esc-para" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deLaMarca.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                  {c.cargo ? <span className="text-muted-foreground"> · {c.cargo}</span> : null}
                </SelectItem>
              ))}
              <SelectItem value={SIN_CONTACTO}>Sin persona concreta</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {esEmail && (
        <Field>
          <FieldLabel htmlFor="esc-asunto">Asunto</FieldLabel>
          <Input id="esc-asunto" value={asunto} onChange={(e) => setRetoque({ clave, asunto: e.target.value, cuerpo })} />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="esc-cuerpo">{esEmail ? "Email" : "Mensaje"}</FieldLabel>
        <Textarea id="esc-cuerpo" rows={esEmail ? 11 : 5} value={cuerpo} onChange={(e) => setRetoque({ clave, asunto, cuerpo: e.target.value })} className="text-sm leading-relaxed" />
      </Field>

      {faltan.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-warning">
          <TriangleAlertIcon className="mt-px size-3.5 flex-none" />
          Sin rellenar: {faltan.map(etiquetaVariable).join(", ")}.{faltan.some((v) => v.startsWith("propuesta.")) ? " Prepara la propuesta para tener el total y el enlace." : " Escríbelo a mano antes de copiar."}
        </p>
      )}

      {pie ? pie(acciones) : <div className="flex flex-wrap items-center justify-end gap-2">{acciones}</div>}
    </div>
  )
}

/** `EscribirMensaje` en un diálogo, para la ficha de una propuesta, una marca o una persona. */
export function EscribirDialog({ open, onOpenChange, marca, propuesta, uso, contactoInicial }: { open: boolean; onOpenChange: (open: boolean) => void; marca: Marca | null; propuesta?: Propuesta | null; uso?: UsoPlantilla; contactoInicial?: string | null }) {
  return (
    <Dialog open={open && marca !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Escribir a {marca?.nombre}</DialogTitle>
          <DialogDescription>Elige una plantilla: se rellena con los datos de la persona y de la propuesta. Retócala si quieres y cópiala.</DialogDescription>
        </DialogHeader>
        {marca && (
          <EscribirMensaje
            key={`${marca.id}:${propuesta?.id ?? ""}:${uso ?? ""}`}
            marca={marca}
            propuesta={propuesta}
            uso={uso}
            contactoInicial={contactoInicial}
            onHecho={() => onOpenChange(false)}
            pie={(acciones) => <DialogFooter className="items-center sm:justify-end">{acciones}</DialogFooter>}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
