"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { BarChart3Icon, ExternalLinkIcon, LineChartIcon, PencilIcon, PlugZapIcon, PlusIcon, SendIcon, TextIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import type { Informe, Pieza, Resultado } from "@/lib/influencer/modelo"
import { piezasPorFecha, redDePieza } from "@/lib/influencer/collabs"
import { caducidad, tokenNuevo } from "@/lib/influencer/formularios"
import { guardarBorrador } from "@/lib/influencer/borradores"
import { tintClass } from "@/lib/influencer/tints"
import { Button } from "@/components/ui/button"
import { Section, SectionBody, SectionHeader } from "@/components/app/section"
import { EmptyState } from "@/components/app/states"
import { SocialIcon } from "@/components/app/social-icons"
import { EditorTexto } from "@/components/influencer/editor-texto"
import { CompartirEnlaceDialog } from "@/components/influencer/compartir-enlace"
import { ICONOS_PIEZA } from "@/components/influencer/piezas-editor"
import { Capturas, CifrasPieza, ResumenResultados } from "@/components/influencer/resumen-resultados"
import { useCollab } from "../collab-provider"
import { ResultadoDialog } from "./resultado-dialog"

/**
 * Los resultados de la collab y el informe para la marca: las cifras de cada pieza publicada (a mano
 * y con capturas; con la API de Instagram y TikTok entrarán solas), el resumen con CPM e interacción
 * y sus conclusiones. Se manda por enlace, sin cuenta.
 */
export function ResultadosView() {
  const { collab, setPieza, marca, hoy, informe: [informe, setInforme] } = useCollab()
  const [editando, setEditando] = React.useState<{ pieza: Pieza; resultado: Resultado | null } | null>(null)
  const [enviado, setEnviado] = React.useState(false)
  const piezas = piezasPorFecha(collab.piezas)
  const publicadas = piezas.filter((p) => p.publicada)
  const resultadoDe = (id: string) => informe.resultados.filter((r) => r.piezaId === id).sort((a, b) => b.medidoEl.localeCompare(a.medidoEl))[0] ?? null
  const ruta = informe.enlace ? `/informe/${informe.enlace.token}` : null

  // Solo en este repo: el informe de la otra pestaña lee del navegador lo último.
  const publicar = (i: Informe) => i.enlace && guardarBorrador(`informe:${i.enlace.token}`, { registro: i, collab, marca })

  const guardarResultado = (r: Resultado) => {
    const nuevo = { ...informe, resultados: [...informe.resultados.filter((x) => x.id !== r.id), r] }
    setInforme(nuevo)
    publicar(nuevo)
    setPieza(r.piezaId, (p) => ({ ...p, estado: "resultados" }))
    toast.success("Resultados guardados")
  }

  const enviar = () => {
    const nuevo: Informe = { ...informe, enlace: informe.enlace ?? { token: tokenNuevo("inf"), caduca: caducidad(hoy) }, enviadoEl: hoy }
    setInforme(nuevo)
    publicar(nuevo)
    setEnviado(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <Section className="flex-none">
        <SectionHeader
          icon={BarChart3Icon}
          title="Resumen"
          meta={informe.enviadoEl ? `Informe enviado el ${fmt.date(informe.enviadoEl)}` : `${informe.resultados.length ? "Sin enviar a la marca" : "Aún sin resultados"}`}
          action={
            <>
              {ruta && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={ruta} target="_blank" onClick={() => publicar(informe)}>
                    <ExternalLinkIcon /> Ver como la marca
                  </Link>
                </Button>
              )}
              <Button size="sm" disabled={informe.resultados.length === 0} onClick={enviar}>
                <SendIcon /> {informe.enviadoEl ? "Volver a enviar" : "Enviar a la marca"}
              </Button>
            </>
          }
        />
        <SectionBody className="p-4">
          <ResumenResultados collab={collab} resultados={informe.resultados} />
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm">
            <PlugZapIcon className="size-4 flex-none text-muted-foreground" />
            <span className="min-w-0 flex-1 text-muted-foreground">Pronto podrás conectar Instagram y TikTok y las cifras de cada publicación entrarán solas. De momento, se apuntan a mano con sus capturas.</span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <SocialIcon network="instagram" className="size-3.5" /> Instagram
              </Button>
              <Button variant="outline" size="sm" disabled>
                <SocialIcon network="tiktok" className="size-3.5" /> TikTok
              </Button>
            </span>
          </div>
        </SectionBody>
      </Section>

      <Section className="flex-none">
        <SectionHeader icon={LineChartIcon} title="Por pieza" count={publicadas.length} meta={`${informe.resultados.length ? new Set(informe.resultados.map((r) => r.piezaId)).size : 0} con resultados`} />
        <SectionBody>
          {piezas.length === 0 ? (
            <EmptyState icon={LineChartIcon} title="Sin piezas" description="Cuando publiques las piezas de la collab, apunta aquí sus resultados." />
          ) : (
            <ul className="divide-y">
              {piezas.map((p) => {
                const r = resultadoDe(p.id)
                const red = redDePieza(p)
                const Icono = ICONOS_PIEZA[p.tipo]
                return (
                  <li key={p.id} className={cn("grid gap-4 px-4 py-3.5 lg:grid-cols-[260px_minmax(0,1fr)_auto] lg:items-center", !p.publicada && "opacity-60")}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn("relative h-14 w-11 flex-none overflow-hidden rounded-md", tintClass[collab.tint])}>
                        {p.portadaUrl ? <Image src={p.portadaUrl} alt="" fill sizes="44px" className="object-cover" /> : <Icono className="absolute inset-0 m-auto size-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{p.titulo}</span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {red && <SocialIcon network={red} className="size-3" />}
                          {p.publicada ? (
                            <a href={p.publicada.url} target="_blank" rel="noreferrer" className="hover:underline">
                              Publicada el {fmt.date(p.publicada.fecha)}
                            </a>
                          ) : (
                            `Sin publicar · ${fmt.date(p.publicacion)}`
                          )}
                        </span>
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
                      {r ? (
                        <>
                          <CifrasPieza resultado={r} />
                          <Capturas capturas={r.capturas} />
                          <span className="w-full text-[11px] text-muted-foreground">
                            Medido el {fmt.date(r.medidoEl)}
                            {r.nota ? ` · ${r.nota}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">{p.publicada ? "Sin resultados todavía: a los 7 días de publicar." : "Cuando se publique."}</span>
                      )}
                    </div>
                    {p.publicada && (
                      <Button variant={r ? "ghost" : "outline"} size="sm" onClick={() => setEditando({ pieza: p, resultado: r })}>
                        {r ? <PencilIcon /> : <PlusIcon />} {r ? "Editar" : "Añadir resultados"}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SectionBody>
      </Section>

      <Section className="flex-none">
        <SectionHeader icon={TextIcon} title="Conclusiones" meta="Lo que cuentas a la marca en el informe: qué funcionó y qué harías distinto" />
        <SectionBody>
          <EditorTexto value={informe.conclusiones} onChange={(html) => setInforme((i) => ({ ...i, conclusiones: html }))} placeholder="El reel funcionó por encima de mi media: los guardados dicen que se usó como referencia…" contenidoClassName="min-h-40 px-5 py-4" />
        </SectionBody>
      </Section>

      {editando && <ResultadoDialog key={editando.pieza.id} open onOpenChange={(o) => !o && setEditando(null)} pieza={editando.pieza} resultado={editando.resultado} hoy={hoy} onGuardar={guardarResultado} />}
      {enviado && ruta && (
        <CompartirEnlaceDialog
          open
          onOpenChange={setEnviado}
          titulo="Informe listo para la marca"
          descripcion={`Mándale el enlace a ${collab.brief.contacto.nombre || marca.nombre}: ve las cifras de cada pieza, las capturas y tus conclusiones, sin cuenta.`}
          ruta={ruta}
          mensaje={`Hola ${collab.brief.contacto.nombre.split(" ")[0] || ""}, aquí tienes los resultados de «${collab.campana}»:`}
          asunto={`Resultados · ${collab.campana}`}
          email={collab.brief.contacto.email}
          verComo="Ver el informe"
        />
      )}
    </div>
  )
}
