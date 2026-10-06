import { ResumenView, type VistaCronograma } from "./resumen-view"

const VISTAS: VistaCronograma[] = ["gantt", "calendario", "tareas"]

/** El resumen de la collab: entregables y cronograma. Los datos los pone el layout (`CollabProvider`). */
export default async function CollabResumenPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams
  return <ResumenView vistaInicial={VISTAS.find((v) => v === vista) ?? "gantt"} />
}
