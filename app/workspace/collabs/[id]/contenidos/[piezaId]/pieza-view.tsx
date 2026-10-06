"use client"

import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon, MessageSquareQuoteIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_PIEZA, ESTADOS_VERSION, estadoDe, type Pieza, type PlantillaGuion, type TipoVersion } from "@/lib/influencer/modelo"
import { etiquetaDePieza, nombreDeParte, parteInicial, partesDePieza, piezasPorFecha, redDePieza, siguientePasoDePieza, ultimaVersion } from "@/lib/influencer/collabs"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { SocialIcon } from "@/components/app/social-icons"
import { usePieza } from "./use-pieza"
import { GuionParte } from "./guion-parte"
import { MediaParte } from "./media-parte"

const PUNTO = { aprobada: "bg-success", cambios: "bg-warning", "en-revision": "bg-info", borrador: "bg-muted-foreground/50" } as const

/** «v2 ·» con el punto del estado de la última versión de esa parte. */
function VersionDe({ pieza, parte }: { pieza: Pieza; parte: TipoVersion }) {
  const v = ultimaVersion(pieza[parte])
  if (!v) return <span className="text-xs font-normal text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
      v{v.numero} <span className={cn("size-1.5 rounded-full", PUNTO[v.estado])} aria-label={estadoDe(ESTADOS_VERSION, v.estado).label} />
    </span>
  )
}

/**
 * El detalle de una pieza: su cabecera (estado, fecha, ronda, lo que toca), el cambio entre sus
 * partes (guion y vídeo o fotos) y la parte abierta, con su editor o su revisión.
 */
export function PiezaView({ piezaId, parte: pedida, plantillas }: { piezaId: string; parte?: TipoVersion; plantillas: PlantillaGuion[] }) {
  const acciones = usePieza(piezaId)
  const { pieza, collab } = acciones
  if (!pieza) return <EmptyState title="Esta pieza ya no existe" description="Puede que se haya borrado. Elige otra en la lista." />

  const partes = partesDePieza(pieza)
  const parte = pedida && partes.includes(pedida) ? pedida : parteInicial(pieza)
  const estado = estadoDe(ESTADOS_PIEZA, pieza.estado)
  const red = redDePieza(pieza)
  const orden = piezasPorFecha(collab.piezas)
  const i = orden.findIndex((p) => p.id === pieza.id)
  const base = `/workspace/collabs/${collab.id}/contenidos`
  const conPieza = { ...acciones, pieza }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-[260px] flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold tracking-tight">
            {pieza.titulo}
            <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            {red && <SocialIcon network={red} className="size-3.5" />}
            {etiquetaDePieza(pieza)}
            <span>·</span>
            {pieza.publicada ? `publicada el ${fmt.date(pieza.publicada.fecha)}` : `publicar el ${fmt.date(pieza.publicacion)}`}
            {partes.includes("media") && (
              <>
                <span>·</span>ronda {pieza.rondaActual} de {collab.brief.rondasIncluidas}
              </>
            )}
            <span>·</span>
            <span className="text-foreground">{siguientePasoDePieza(pieza)}</span>
          </p>
          {pieza.indicaciones && (
            <p className="mt-2 flex max-w-3xl items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <MessageSquareQuoteIcon className="mt-0.5 size-4 flex-none text-muted-foreground" />
              <span>
                <span className="font-medium">La marca pide:</span> {pieza.indicaciones}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {partes.length > 1 && (
            <nav aria-label="Partes de la pieza" className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-muted p-[3px]">
              {partes.map((p) => (
                <Link key={p} href={`?parte=${p}`} aria-current={p === parte ? "page" : undefined} className={cn("inline-flex h-full items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors", p === parte ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {nombreDeParte(pieza, p)}
                  <VersionDe pieza={pieza} parte={p} />
                </Link>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-1 rounded-lg border px-1">
            <Button variant="ghost" size="icon-sm" asChild aria-label="Pieza anterior">
              <Link href={i > 0 ? `${base}/${orden[i - 1].id}` : "#"} aria-disabled={i <= 0} className={cn(i <= 0 && "pointer-events-none opacity-40")}>
                <ChevronLeftIcon />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {i + 1} de {orden.length}
            </span>
            <Button variant="ghost" size="icon-sm" asChild aria-label="Pieza siguiente">
              <Link href={i < orden.length - 1 ? `${base}/${orden[i + 1].id}` : "#"} aria-disabled={i >= orden.length - 1} className={cn(i >= orden.length - 1 && "pointer-events-none opacity-40")}>
                <ChevronRightIcon />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {parte === "guion" ? <GuionParte key={`${pieza.id}-guion`} acciones={conPieza} plantillas={plantillas} /> : <MediaParte key={`${pieza.id}-media`} acciones={conPieza} />}
    </div>
  )
}
