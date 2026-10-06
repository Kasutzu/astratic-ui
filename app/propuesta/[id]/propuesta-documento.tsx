"use client"

import { fmt } from "@/lib/format"
import { EXTRAS, FORMATOS, describirPiezas, type Contacto, type Marca, type MediaKit, type Perfil, type Propuesta } from "@/lib/influencer/modelo"
import { calcularPresupuesto } from "@/lib/influencer/presupuesto"
import { bloquesVisibles } from "@/lib/influencer/media-kit"
import { DocViewer } from "@/components/document/sheet"
import { DocKeyFacts, DocSimpleSection, DocSimpleTitle, DocTable, DocTerms, DocText } from "@/components/document/simple"
import { DocToolbar } from "@/components/document/toolbar"
import { EmptyState } from "@/components/app/states"
import { DocInfluencerSheet } from "@/components/influencer/doc-sheet"
import { MediaKitHojas, hojasMediaKit } from "@/components/influencer/media-kit-doc"
import { useBorrador } from "@/components/influencer/navegador"

export type DatosPropuesta = { propuesta: Propuesta; marca: Marca; contacto: Contacto | null }

/**
 * La página del documento: lo que llega del servidor o, si se acaba de preparar en el workspace, el
 * borrador guardado en el navegador (en el portal siempre vendrá de la base de datos).
 */
export function PropuestaDocumentoPagina({ id, inicial, perfil, kit, marcasTrabajadas }: { id: string; inicial: DatosPropuesta | null; perfil: Perfil; kit: MediaKit; marcasTrabajadas: string[] }) {
  const datos = useBorrador<DatosPropuesta | null>(`propuesta:${id}`, inicial)
  const kitActual = useBorrador<MediaKit>("media-kit", kit)
  if (!datos) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <EmptyState title="Esta propuesta no existe" description="Puede que el enlace esté mal copiado o que la propuesta se haya borrado." />
      </main>
    )
  }
  return <PropuestaDocumento {...datos} perfil={perfil} kit={kitActual} marcasTrabajadas={marcasTrabajadas} />
}

/** Media kit (con o sin precios) y presupuesto con sus condiciones, en A4. */
export function PropuestaDocumento({ propuesta, marca, contacto, perfil, kit, marcasTrabajadas }: DatosPropuesta & { perfil: Perfil; kit: MediaKit; marcasTrabajadas: string[] }) {
  const presupuesto = propuesta.presupuesto
  const calculo = presupuesto ? calcularPresupuesto(presupuesto, perfil.tarifas) : null
  const bloques = bloquesVisibles(kit, { conPrecios: presupuesto?.conPrecios ?? true })
  const hojasKit = hojasMediaKit(bloques)
  const pie = `${perfil.nombre} · Media kit y presupuesto para ${marca.nombre}`
  const total = hojasKit + (presupuesto ? 1 : 0)
  const condicionesPropias = presupuesto?.condiciones?.split("\n").map((l) => l.trim()).filter(Boolean) ?? []

  return (
    <DocViewer pages={total} toolbar={<DocToolbar title={`Propuesta para ${marca.nombre}`} meta={`${propuesta.campana} · A4 · ${total} ${total === 1 ? "hoja" : "hojas"}`} backHref={`/workspace/crm?registro=${propuesta.id}`} />}>
      <MediaKitHojas perfil={perfil} kit={kit} bloques={bloques} marcasTrabajadas={marcasTrabajadas} pie={pie} />

      {presupuesto && calculo && (
        <DocInfluencerSheet nombre={perfil.nombre} handle={perfil.handle} footer={pie}>
          <DocSimpleTitle title={`Presupuesto · ${propuesta.campana}`}>
            Para {contacto ? `${contacto.nombre}, de ` : ""}
            {marca.nombre}: {describirPiezas(presupuesto.lineas.map((l) => ({ formato: l.formato, cantidad: l.cantidad })))}
            {propuesta.desde && propuesta.hasta ? `, con publicación entre el ${fmt.date(propuesta.desde)} y el ${fmt.date(propuesta.hasta)}` : ""}.
          </DocSimpleTitle>

          <DocKeyFacts
            items={[
              { label: "Total", value: fmt.eur(calculo.total) },
              { label: "Validez", value: `${presupuesto.validez} días` },
              { label: "Pago", value: presupuesto.pago },
            ]}
          />

          <DocSimpleSection title="Detalle">
            <DocTable
              columns={[{ label: "Concepto" }, { label: "Cantidad", className: "w-[80px] text-right" }, { label: "Precio", className: "w-[90px] text-right" }, { label: "Importe", className: "w-[100px] text-right" }]}
              rows={[
                ...presupuesto.lineas.map((l) => [
                  FORMATOS[l.formato].label,
                  <span key="c" className="block text-right tabular-nums">{l.cantidad}</span>,
                  <span key="p" className="block text-right tabular-nums">{fmt.eur(l.precio)}</span>,
                  <span key="i" className="block text-right tabular-nums">{fmt.eur(l.cantidad * l.precio)}</span>,
                ]),
                ...calculo.recargos.map((r) => [r.label, "", <span key="p" className="block text-right tabular-nums text-muted-foreground">+{Math.round((EXTRAS.find((e) => e.id === r.id)?.recargo ?? 0) * 100)} %</span>, <span key="i" className="block text-right tabular-nums">{fmt.eur(r.importe)}</span>]),
                [<span key="t" className="font-semibold">Total (IVA aparte)</span>, "", "", <span key="i" className="block text-right font-semibold tabular-nums">{fmt.eur(calculo.total)}</span>],
              ]}
            />
          </DocSimpleSection>

          <DocSimpleSection title="Condiciones">
            <DocTerms
              items={[
                { label: "Rondas de cambios", value: `${presupuesto.rondas} por pieza, sobre el guion y sobre el vídeo` },
                { label: "Derechos de uso", value: presupuesto.extras.includes("derechos") ? "Seis meses en los canales de la marca" : "Solo orgánico, en mis perfiles" },
                { label: "Exclusividad", value: presupuesto.extras.includes("exclusividad") ? "Tres meses sin marcas de la misma categoría" : "Sin exclusividad" },
                { label: "Paid o whitelisting", value: presupuesto.extras.includes("paid") ? "Incluido" : "No incluido; se presupuesta aparte" },
                { label: "Publicidad", value: "Todo el contenido se marca como publicidad en la propia plataforma" },
                { label: "Facturación", value: propuesta.origen === "red" ? "Factura Astratic Network; la marca paga a Astratic" : `Factura de ${perfil.nombre}` },
                ...condicionesPropias.map((c, i) => ({ label: i === 0 ? "Además" : "", value: c })),
              ]}
            />
            <DocText muted className="mt-4">
              Para aceptar, responde a este email o escríbeme a {perfil.email}: te mando el calendario de entregas en cuanto cerremos las fechas.
            </DocText>
          </DocSimpleSection>
        </DocInfluencerSheet>
      )}
    </DocViewer>
  )
}
