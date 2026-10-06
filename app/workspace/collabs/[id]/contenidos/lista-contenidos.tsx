"use client"

import * as React from "react"
import { ClapperboardIcon, PlusIcon } from "lucide-react"
import type { Pieza } from "@/lib/influencer/modelo"
import { piezasPorFecha } from "@/lib/influencer/collabs"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Section, SectionBody, SectionHeader } from "@/components/app/section"
import { EmptyState } from "@/components/app/states"
import { PiezaCard } from "@/components/influencer/pieza-card"
import { useCollab } from "../collab-provider"
import { NuevaPiezaDialog } from "./nueva-pieza-dialog"

type Filtro = "todas" | "me-toca" | "esperando" | "aprobadas" | "publicadas"

const FILTROS: { id: Filtro; label: string; cumple: (p: Pieza) => boolean }[] = [
  { id: "todas", label: "Todas", cumple: () => true },
  { id: "me-toca", label: "Me toca", cumple: (p) => p.estado === "borrador" || p.estado === "cambios" || p.estado === "aprobado" },
  { id: "esperando", label: "Esperando a la marca", cumple: (p) => p.estado === "en-revision" },
  { id: "aprobadas", label: "Aprobadas", cumple: (p) => p.estado === "aprobado" || p.estado === "programado" },
  { id: "publicadas", label: "Publicadas", cumple: (p) => p.estado === "publicado" || p.estado === "resultados" },
]

/**
 * Los contenidos de la collab, uno encima de otro en el orden en que se publican. Al abrir uno, la
 * lista pasa a la barra lateral y el resto de la página es su editor.
 */
export function ListaContenidos({ nuevaInicial }: { nuevaInicial: boolean }) {
  const { collab, hoy } = useCollab()
  const [filtro, setFiltro] = React.useState<Filtro>("todas")
  const [nueva, setNueva] = React.useState(nuevaInicial)
  const piezas = piezasPorFecha(collab.piezas)
  const visibles = piezas.filter(FILTROS.find((f) => f.id === filtro)?.cumple ?? (() => true))

  return (
    <>
      <Section>
        <SectionHeader
          icon={ClapperboardIcon}
          title="Contenidos"
          count={piezas.length}
          action={
            <Button size="sm" onClick={() => setNueva(true)}>
              <PlusIcon /> Añadir pieza
            </Button>
          }
        >
          <Tabs value={filtro} onValueChange={(v) => setFiltro(FILTROS.find((f) => f.id === v)?.id ?? "todas")} className="ml-2 hidden md:block">
            <TabsList className="h-7">
              {FILTROS.map((f) => {
                const n = piezas.filter(f.cumple).length
                return (
                  <TabsTrigger key={f.id} value={f.id} disabled={n === 0 && f.id !== "todas"} className="text-xs">
                    {f.label}
                    {f.id !== "todas" && n > 0 && <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{n}</span>}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </SectionHeader>
        <SectionBody className="p-3">
          {visibles.length === 0 ? (
            <EmptyState
              icon={ClapperboardIcon}
              title={filtro === "todas" ? "Sin piezas" : "Nada aquí"}
              description={filtro === "todas" ? "Añade las piezas del brief: cada una con su guion, su vídeo o sus fotos y su enlace de revisión." : "Cambia el filtro para ver el resto."}
              action={filtro === "todas" ? <Button size="sm" onClick={() => setNueva(true)}><PlusIcon /> Añadir pieza</Button> : undefined}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {visibles.map((p) => (
                <PiezaCard key={p.id} pieza={p} tint={collab.tint} hoy={soloFecha(hoy)} href={`/workspace/collabs/${collab.id}/contenidos/${p.id}`} />
              ))}
            </div>
          )}
        </SectionBody>
      </Section>
      <NuevaPiezaDialog open={nueva} onOpenChange={setNueva} />
    </>
  )
}
