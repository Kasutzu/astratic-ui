import Image from "next/image"
import { ShieldCheckIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { EXTRAS, FORMATOS, describirPiezas, type Marca, type Perfil, type Propuesta } from "@/lib/influencer/modelo"
import { calcularPresupuesto } from "@/lib/influencer/presupuesto"
import { socialLabel } from "@/components/app/social-icons"
import { DocViewer } from "@/components/document/sheet"
import { DocKeyFacts, DocNotice, DocSimpleSection, DocSimpleTitle, DocTable, DocTerms, DocText } from "@/components/document/simple"
import { DocInfluencerSheet } from "@/components/influencer/doc-sheet"
import { DocToolbar } from "@/components/document/toolbar"

const DIAS_VALIDEZ = 15

/** Media kit (hoja 1) y presupuesto (hoja 2) de una propuesta, con las piezas del formato simple de Astratic UI. */
export function PropuestaDocumento({ propuesta, marca, perfil, marcasTrabajadas }: { propuesta: Propuesta; marca: Marca; perfil: Perfil; marcasTrabajadas: string[] }) {
  const presupuesto = propuesta.presupuesto
  const calculo = presupuesto ? calcularPresupuesto(presupuesto, perfil.tarifas) : null
  const conPrecios = presupuesto?.conPrecios ?? true
  const seguidores = perfil.cuentas.reduce((a, c) => a + c.seguidores, 0)
  const visualizaciones = perfil.cuentas.reduce((a, c) => a + c.visualizacionesMedias, 0)
  const interaccion = perfil.cuentas.reduce((a, c) => a + c.interaccion, 0) / perfil.cuentas.length
  const pie = `${perfil.nombre} · Media kit y presupuesto para ${marca.nombre}`

  return (
    <DocViewer pages={presupuesto ? 2 : 1} toolbar={<DocToolbar title={`Propuesta para ${marca.nombre}`} meta={`${propuesta.campana} · A4 · ${presupuesto ? "2 hojas" : "1 hoja"}`} backHref={`/workspace/propuestas?propuesta=${propuesta.id}`} />}>
      <DocInfluencerSheet nombre={perfil.nombre} handle={perfil.handle} footer={pie}>
        <div className="mt-[34px] flex items-start gap-6">
          <span className="relative size-[132px] flex-none overflow-hidden rounded-2xl bg-muted">
            <Image src={perfil.fotoUrl} alt={perfil.nombre} fill sizes="132px" className="object-cover" />
          </span>
          <div className="min-w-0 pt-1">
            <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.02em]">{perfil.nombre}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {perfil.handle} · {perfil.nicho} · {perfil.ciudad}
            </p>
            <p className="mt-3 max-w-[460px] text-[12.5px] leading-[1.6]">{perfil.bio}</p>
          </div>
        </div>

        <DocKeyFacts
          items={[
            { label: "Seguidores", value: fmt.compact(seguidores) },
            { label: "Visualizaciones medias", value: fmt.compact(visualizaciones) },
            { label: "Interacción media", value: fmt.pct(Math.round(interaccion * 10) / 10) },
            { label: "Audiencia en España", value: fmt.pct(perfil.audiencia.espana) },
          ]}
        />

        <DocSimpleSection title="Mis redes">
          <DocTable
            columns={[{ label: "Red" }, { label: "Seguidores", className: "w-[110px] text-right" }, { label: "Visualizaciones medias", className: "w-[150px] text-right" }, { label: "Interacción", className: "w-[90px] text-right" }]}
            rows={perfil.cuentas.map((c) => [
              <span key="r" className="font-medium">{socialLabel[c.red]} <span className="font-normal text-muted-foreground">{c.handle}</span></span>,
              <span key="s" className="block text-right tabular-nums">{fmt.num(c.seguidores)}</span>,
              <span key="v" className="block text-right tabular-nums">{fmt.num(c.visualizacionesMedias)}</span>,
              <span key="i" className="block text-right tabular-nums">{fmt.pct(c.interaccion)}</span>,
            ])}
          />
          <DocText muted className="mt-2">
            Visualizaciones medias de las últimas publicaciones, sin contar las promocionadas. Audiencia: {fmt.pct(perfil.audiencia.mujeres)} mujeres, sobre todo de {perfil.audiencia.edades}.
          </DocText>
        </DocSimpleSection>

        <DocSimpleSection title="Marcas con las que he trabajado">
          <div className="flex flex-wrap gap-1.5">
            {marcasTrabajadas.map((m) => (
              <span key={m} className="rounded-md border px-2 py-0.5 text-[11.5px] font-medium">
                {m}
              </span>
            ))}
          </div>
        </DocSimpleSection>

        {conPrecios && (
          <DocSimpleSection title="Tarifas de salida">
            <DocTable
              columns={[{ label: "Formato" }, { label: "Precio", className: "w-[110px] text-right" }]}
              rows={perfil.tarifas.map((t) => [FORMATOS[t.formato].label, <span key="p" className="block text-right tabular-nums">{fmt.eur(t.precio)}</span>])}
            />
            <DocText muted className="mt-2">
              Packs, derechos de uso, exclusividad y paid se presupuestan aparte, según la campaña.
            </DocText>
          </DocSimpleSection>
        )}

        <DocNotice tone="info" icon={ShieldCheckIcon} className="mt-5">
          Perfil auditado por Astratic Network: tramo {perfil.tramo}, cifras verificadas en octubre de 2026. Todo el contenido patrocinado se marca como publicidad según el código de Autocontrol.
        </DocNotice>
      </DocInfluencerSheet>

      {presupuesto && calculo && (
        <DocInfluencerSheet nombre={perfil.nombre} handle={perfil.handle} footer={pie}>
          <DocSimpleTitle title={`Presupuesto · ${propuesta.campana}`}>
            Para {marca.nombre}: {describirPiezas(presupuesto.lineas.map((l) => ({ formato: l.formato, cantidad: l.cantidad })))}
            {propuesta.desde && propuesta.hasta ? `, con publicación entre el ${fmt.date(propuesta.desde)} y el ${fmt.date(propuesta.hasta)}` : ""}.
          </DocSimpleTitle>

          <DocKeyFacts
            items={[
              { label: "Total", value: fmt.eur(calculo.total) },
              { label: "Validez", value: `${DIAS_VALIDEZ} días` },
              { label: "Pago", value: propuesta.origen === "red" ? "Factura Astratic" : "30 días tras publicar" },
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
                { label: "Rondas de cambios", value: "Dos por pieza, sobre el guion y sobre el vídeo" },
                { label: "Derechos de uso", value: presupuesto.extras.includes("derechos") ? "Seis meses en los canales de la marca" : "Solo orgánico, en mis perfiles" },
                { label: "Exclusividad", value: presupuesto.extras.includes("exclusividad") ? "Tres meses sin marcas de la misma categoría" : "Sin exclusividad" },
                { label: "Paid o whitelisting", value: presupuesto.extras.includes("paid") ? "Incluido" : "No incluido; se presupuesta aparte" },
                { label: "Publicidad", value: "Todo el contenido se marca como publicidad en la propia plataforma" },
                { label: "Facturación", value: propuesta.origen === "red" ? "Factura Astratic Network; la marca paga a Astratic" : `Factura de ${perfil.nombre}, a 30 días desde la publicación` },
              ]}
            />
            <DocText muted className="mt-4">
              Para aceptar, responde a este email o escríbeme por donde hemos hablado: te mando el calendario de entregas en cuanto cerremos las fechas.
            </DocText>
          </DocSimpleSection>
        </DocInfluencerSheet>
      )}
    </DocViewer>
  )
}
