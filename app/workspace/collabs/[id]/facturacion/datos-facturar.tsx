"use client"

import * as React from "react"
import Link from "next/link"
import { Building2Icon, SendIcon, UserRoundIcon } from "lucide-react"
import type { DatosFacturacion, DatosFiscales } from "@/lib/influencer/modelo"
import { Button } from "@/components/ui/button"
import { Section, SectionBody, SectionHeader } from "@/components/app/section"
import { DetailField, DetailFields } from "@/components/app/detail-sheet"
import { InlineField, type ValorInline } from "@/components/app/inline-field"
import { PedirFormularioDialog } from "../pedir-formulario-dialog"

const VACIO: DatosFacturacion = { razonSocial: "", nif: "", direccion: "", email: "" }

function Fila({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 py-1 text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{valor}</dd>
    </div>
  )
}

/**
 * A quién se factura y con qué datos: la marca (se editan aquí o los rellena ella en su formulario)
 * o, en las collabs de la red, Astratic. Debajo, sus datos fiscales, que salen en cada factura.
 */
export function DatosFacturar({ red, cliente, fiscales, marca, onCliente }: { red: boolean; cliente?: DatosFacturacion; fiscales: DatosFiscales; marca: string; onCliente: (d: DatosFacturacion) => void }) {
  const [pedir, setPedir] = React.useState(false)
  const datos = cliente ?? VACIO
  const campo = (clave: keyof DatosFacturacion) => async (v: ValorInline) => onCliente({ ...datos, [clave]: String(v ?? "") })
  const faltan = !red && (!datos.razonSocial || !datos.nif)

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Section className="flex-none">
        <SectionHeader icon={Building2Icon} title={red ? "Facturas a Astratic" : `Facturar a ${marca}`} />
        <SectionBody className="p-4">
          {red ? (
            <>
              <dl>
                <Fila label="Razón social" valor={datos.razonSocial} />
                <Fila label="NIF" valor={datos.nif} />
                <Fila label="Dirección" valor={datos.direccion} />
                <Fila label="Email" valor={datos.email} />
              </dl>
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Es una collab de la red: Astratic factura a la marca el total y tú facturas a Astratic tu 80 %.</p>
            </>
          ) : (
            <>
              <DetailFields>
                <DetailField key="razon" label="Razón social" empty={!datos.razonSocial}>
                  <InlineField value={datos.razonSocial || null} tipo="texto" placeholder="Marca S.L." onSave={campo("razonSocial")} />
                </DetailField>
                <DetailField key="nif" label="NIF" empty={!datos.nif}>
                  <InlineField value={datos.nif || null} tipo="texto" placeholder="B12345678" onSave={campo("nif")} />
                </DetailField>
                <DetailField key="direccion" label="Dirección" empty={!datos.direccion}>
                  <InlineField value={datos.direccion || null} tipo="textarea" multiline={2} onSave={campo("direccion")} />
                </DetailField>
                <DetailField key="email" label="Email" empty={!datos.email}>
                  <InlineField value={datos.email || null} tipo="email" placeholder="facturas@marca.com" onSave={campo("email")} />
                </DetailField>
                <DetailField key="pedido" label="Nº de pedido" empty={!datos.pedido}>
                  <InlineField value={datos.pedido ?? null} tipo="texto" placeholder="PO-…" onSave={campo("pedido")} />
                </DetailField>
              </DetailFields>
              {faltan && (
                <div className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                  Faltan sus datos de facturación.
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-warning hover:text-warning" onClick={() => setPedir(true)}>
                    <SendIcon /> Pedírselos
                  </Button>
                </div>
              )}
            </>
          )}
        </SectionBody>
      </Section>

      <Section className="flex-none">
        <SectionHeader icon={UserRoundIcon} title="Tus datos" action={<Link href="/workspace/ajustes" className="text-xs font-medium text-brand hover:underline">Editar</Link>} />
        <SectionBody className="p-4">
          <dl>
            <Fila label="Nombre" valor={fiscales.nombre} />
            <Fila label="NIF" valor={fiscales.nif} />
            <Fila label="Dirección" valor={fiscales.direccion} />
            <Fila label="IBAN" valor={<span className="font-mono text-xs">{fiscales.iban}</span>} />
            <Fila label="Impuestos" valor={`IVA ${fiscales.ivaPct} % · IRPF ${fiscales.irpfPct} %`} />
            <Fila label="Forma" valor={fiscales.forma === "autonoma" ? "Autónoma" : "Sociedad"} />
          </dl>
        </SectionBody>
      </Section>
      <PedirFormularioDialog open={pedir} onOpenChange={setPedir} alcance="brief" />
    </div>
  )
}
