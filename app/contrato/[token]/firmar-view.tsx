"use client"

import * as React from "react"
import { toast } from "sonner"
import { CircleCheckIcon, EyeIcon, PenLineIcon, PrinterIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { ESTADOS_CONTRATO, estadoDe, type Collab, type Contrato, type DatosFiscales, type Marca, type Perfil } from "@/lib/influencer/modelo"
import { valoresDeContrato, variableDe } from "@/lib/influencer/contratos"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { PaginaMarca } from "@/components/influencer/pagina-marca"
import { EditorTexto } from "@/components/influencer/editor-texto"
import { Firmas } from "@/components/influencer/firmas-contrato"
import { useBorrador } from "@/components/influencer/navegador"

export type DatosContrato = { registro: Contrato; collab: Collab; marca: Marca }

function Firmar({ datos, perfil, fiscales, hoy }: { datos: DatosContrato; perfil: Perfil; fiscales: DatosFiscales; hoy: string }) {
  const { collab, marca } = datos
  const [contrato, setContrato] = React.useState(datos.registro)
  const [nombre, setNombre] = React.useState(collab.brief.contacto.nombre)
  const [acepto, setAcepto] = React.useState(false)
  const valores = valoresDeContrato({ collab, marca, perfil, fiscales, hoy })
  const estado = estadoDe(ESTADOS_CONTRATO, contrato.estado)
  const firmada = contrato.firmas.some((f) => f.lado === "marca")

  const firmar = () => {
    // En el portal: se guarda con el nombre, la fecha, la IP y la huella del documento, y se avisa a la influencer.
    setContrato((c) => ({ ...c, estado: "firmado", firmas: [...c.firmas, { lado: "marca", nombre: nombre.trim(), el: hoy }] }))
    toast.success(`Contrato firmado. ${perfil.nombrePila} recibe el aviso.`)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start print:block">
      <article className="overflow-hidden rounded-lg bg-card shadow-card print:shadow-none">
        <EditorTexto value={contrato.texto} editable={false} variables={{ valores, verDatos: true, etiqueta: (c) => variableDe(c)?.label ?? c }} contenidoClassName="px-8 py-10 md:px-14 md:py-14" />
      </article>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 print:hidden">
        <section className="rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-base font-semibold">{contrato.titulo}</h2>
            <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre {marca.nombre} y {perfil.nombre} · {collab.campana}
          </p>
          <div className="mt-4">
            <Firmas contrato={contrato} suNombre={fiscales.nombre} marca={collab.brief.contacto.nombre || marca.nombre} />
          </div>
        </section>

        {contrato.estado === "borrador" && (
          <p className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            <EyeIcon className="mt-0.5 size-4 flex-none" /> Vista previa del borrador: aún no se ha enviado para firmar.
          </p>
        )}

        {contrato.estado === "enviado" && !firmada && (
          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold">Firmar</h3>
            <p className="mt-1 text-xs text-muted-foreground">Queda registrado tu nombre, la fecha y la hora. Es firma electrónica simple, válida para un contrato comercial.</p>
            <div className="mt-4 grid gap-3">
              <Field>
                <FieldLabel htmlFor="fc-nombre">Tu nombre completo</FieldLabel>
                <Input id="fc-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
              </Field>
              <label className="flex items-start gap-2.5 text-sm">
                <Checkbox checked={acepto} onCheckedChange={(c) => setAcepto(c === true)} className="mt-0.5" />
                He leído el contrato y lo acepto en nombre de {marca.nombre}.
              </label>
              <Button disabled={!acepto || !nombre.trim()} onClick={firmar}>
                <PenLineIcon /> Firmar el contrato
              </Button>
            </div>
          </section>
        )}

        {contrato.estado === "firmado" && (
          <p className="flex items-start gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
            <CircleCheckIcon className="mt-0.5 size-4 flex-none" /> Firmado por las dos partes{contrato.firmas[1] ? ` el ${fmt.date(contrato.firmas[1].el)}` : ""}.
          </p>
        )}

        <Button variant="outline" onClick={() => window.print()}>
          <PrinterIcon /> Descargar en PDF
        </Button>
      </aside>
    </div>
  )
}

/**
 * El contrato que firma la marca por enlace, sin cuenta: el documento con los datos de la collab y la
 * firma con registro. Lo que llega del servidor o, si se acaba de enviar desde el workspace, lo guardado
 * en el navegador. «Descargar en PDF» imprime solo el documento.
 */
export function FirmarView({ token, inicial, perfil, fiscales, hoy }: { token: string; inicial: DatosContrato | null; perfil: Perfil; fiscales: DatosFiscales; hoy: string }) {
  const datos = useBorrador<DatosContrato | null>(`contrato:${token}`, inicial)
  if (!datos) return <main className="grid min-h-screen place-items-center p-6"><EmptyState title="Este enlace no existe o ha caducado" description="Pide uno nuevo a quien te lo mandó." /></main>
  return (
    <PaginaMarca seccion="Contrato" marca={datos.marca.nombre} perfil={perfil} pie={`Enlace privado para ${datos.marca.nombre}, sin cuenta.${datos.registro.enlace ? ` Caduca el ${fmt.date(datos.registro.enlace.caduca)}.` : ""}`}>
      <Firmar key={token} datos={datos} perfil={perfil} fiscales={fiscales} hoy={hoy} />
    </PaginaMarca>
  )
}
