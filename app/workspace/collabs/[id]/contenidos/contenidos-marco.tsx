"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { parteInicial, piezasPorFecha } from "@/lib/influencer/collabs"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PiezaCard } from "@/components/influencer/pieza-card"
import { useCollab } from "../collab-provider"
import { NuevaPiezaDialog } from "./nueva-pieza-dialog"

/** La lista de contenidos encogida a barra lateral: cada pieza y, en la abierta, sus partes. En el móvil, solo la vuelta a la lista. */
function Barra({ abierta }: { abierta: string }) {
  const { collab, hoy } = useCollab()
  const parte = useSearchParams().get("parte")
  const [nueva, setNueva] = React.useState(false)
  const base = `/workspace/collabs/${collab.id}/contenidos`
  return (
    <aside className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={base}>
            <ArrowLeftIcon /> Contenidos
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">{collab.piezas.length}</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Añadir pieza" onClick={() => setNueva(true)}>
          <PlusIcon />
        </Button>
      </div>
      <nav aria-label="Piezas de la collab" className="-mx-1 hidden flex-col gap-1 overflow-y-auto px-1 pb-1 lg:flex">
        {piezasPorFecha(collab.piezas).map((p) => (
          <PiezaCard key={p.id} pieza={p} tint={collab.tint} hoy={soloFecha(hoy)} href={`${base}/${p.id}`} activa={p.id === abierta} parteActiva={p.id === abierta ? (parte === "guion" || parte === "media" ? parte : parteInicial(p)) : undefined} compacta />
        ))}
      </nav>
      <NuevaPiezaDialog open={nueva} onOpenChange={setNueva} />
    </aside>
  )
}

/**
 * Contenidos: sin pieza abierta, la lista a todo el ancho (la página); con una abierta, la lista se
 * encoge a barra lateral y el resto es el editor de esa pieza. La barra no se vuelve a montar al
 * cambiar de pieza.
 */
export function ContenidosMarco({ children }: { children: React.ReactNode }) {
  const abierta = useSelectedLayoutSegment()
  if (!abierta) return <>{children}</>
  return (
    <div className="grid gap-5 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
      <React.Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Barra abierta={abierta} />
      </React.Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
