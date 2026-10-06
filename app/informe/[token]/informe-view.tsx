"use client"

import Image from "next/image"
import { ExternalLinkIcon, PrinterIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import type { Collab, Informe, Marca, Perfil } from "@/lib/influencer/modelo"
import { describirEntregables, piezasPorFecha, redDePieza } from "@/lib/influencer/collabs"
import { tintClass } from "@/lib/influencer/tints"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/app/states"
import { SocialIcon } from "@/components/app/social-icons"
import { PaginaMarca } from "@/components/influencer/pagina-marca"
import { EditorTexto } from "@/components/influencer/editor-texto"
import { Capturas, CifrasPieza, ResumenResultados } from "@/components/influencer/resumen-resultados"
import { useBorrador } from "@/components/influencer/navegador"

export type DatosInforme = { registro: Informe; collab: Collab; marca: Marca }

/**
 * El informe de resultados que recibe la marca por enlace, sin cuenta: el resumen (alcance,
 * interacción, CPM, clics), cada pieza con sus cifras y capturas, y las conclusiones de la creadora.
 * Se imprime o se guarda en PDF desde el navegador.
 */
export function InformeView({ token, inicial, perfil }: { token: string; inicial: DatosInforme | null; perfil: Perfil }) {
  const datos = useBorrador<DatosInforme | null>(`informe:${token}`, inicial)
  if (!datos) return <main className="grid min-h-screen place-items-center p-6"><EmptyState title="Este enlace no existe o ha caducado" description="Pide uno nuevo a quien te lo mandó." /></main>
  const { registro: informe, collab, marca } = datos
  const publicadas = piezasPorFecha(collab.piezas).filter((p) => p.publicada)
  const resultadoDe = (id: string) => informe.resultados.filter((r) => r.piezaId === id).sort((a, b) => b.medidoEl.localeCompare(a.medidoEl))[0]

  return (
    <PaginaMarca seccion="Informe de resultados" marca={marca.nombre} perfil={perfil}>
      <section className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className={cn("relative h-32 md:h-40", !collab.coverUrl && tintClass[collab.tint])}>
          {collab.coverUrl && (
            <>
              <Image src={collab.coverUrl} alt="" fill sizes="1100px" className="object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />
            </>
          )}
          <div className={cn("absolute right-5 bottom-4 left-5", collab.coverUrl && "text-white")}>
            <p className="text-sm opacity-80">
              {marca.nombre} × {perfil.nombre}
            </p>
            <h1 className="text-[24px] leading-tight font-semibold tracking-tight md:text-[27px]">Resultados · {collab.campana}</h1>
          </div>
        </div>
        <div className="flex flex-col gap-5 p-5 md:p-6">
          <p className="text-sm text-muted-foreground">
            {describirEntregables(collab)} · publicación del {fmt.date(collab.desde)} al {fmt.date(collab.hasta)}
            {informe.enviadoEl ? ` · informe del ${fmt.date(informe.enviadoEl)}` : ""}
          </p>
          <ResumenResultados collab={collab} resultados={informe.resultados} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Por pieza</h2>
        {publicadas.map((p) => {
          const r = resultadoDe(p.id)
          const red = redDePieza(p)
          return (
            <article key={p.id} className="grid gap-4 rounded-2xl bg-card p-4 shadow-card md:grid-cols-[200px_minmax(0,1fr)] md:p-5">
              <div className="flex gap-3 md:flex-col">
                <span className={cn("relative h-24 w-[72px] flex-none overflow-hidden rounded-lg md:h-40 md:w-full", tintClass[collab.tint])}>{p.portadaUrl && <Image src={p.portadaUrl} alt="" fill sizes="200px" className="object-cover" />}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{p.titulo}</span>
                  {p.publicada && (
                    <a href={p.publicada.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                      {red && <SocialIcon network={red} className="size-3" />} Publicada el {fmt.date(p.publicada.fecha)} <ExternalLinkIcon className="size-3" />
                    </a>
                  )}
                </span>
              </div>
              {r ? (
                <div className="flex min-w-0 flex-col gap-4">
                  <CifrasPieza resultado={r} />
                  <Capturas capturas={r.capturas} />
                  <p className="text-xs text-muted-foreground">
                    Medido el {fmt.date(r.medidoEl)}
                    {r.nota ? ` · ${r.nota}` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Las cifras de esta pieza llegarán en unos días.</p>
              )}
            </article>
          )
        })}
      </section>

      {informe.conclusiones && (
        <section className="rounded-2xl bg-card p-5 shadow-card md:p-6">
          <h2 className="mb-2 text-base font-semibold">Conclusiones de {perfil.nombrePila}</h2>
          <EditorTexto value={informe.conclusiones} editable={false} />
        </section>
      )}

      <div className="flex justify-center print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <PrinterIcon /> Descargar en PDF
        </Button>
      </div>
    </PaginaMarca>
  )
}
