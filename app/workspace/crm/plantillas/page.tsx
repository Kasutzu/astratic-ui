import { Suspense } from "react"
import type { Metadata } from "next"
import { PageSkeleton } from "@/components/app/states"
import { PlantillasView } from "./plantillas-view"

export const metadata: Metadata = { title: "Plantillas · CRM" }

/** Los filtros viven en la URL (`useSearchParams`): en una página estática van dentro de Suspense. */
export default function PlantillasPage() {
  return (
    <Suspense fallback={<PageSkeleton kpis={0} />}>
      <PlantillasView />
    </Suspense>
  )
}
