import type { Metadata } from "next"
import {
  demoCollabs,
  demoHighlight,
  demoLinks,
  demoNotices,
  demoProfile,
  demoStats,
  demoTasks,
} from "@/lib/influencer/demo-data"
import { InicioView } from "./inicio-view"

export const metadata: Metadata = { title: "Inicio" }

/** Los datos de ejemplo viven en octubre de 2026: la demo se mira «desde» ese día para que las fechas cuadren. */
const HOY = new Date("2026-10-06T11:30:00")

function saludo(d: Date) {
  const h = d.getHours()
  if (h < 13) return "Buenos días"
  if (h < 20) return "Buenas tardes"
  return "Buenas noches"
}

export default function InicioPage() {
  return (
    <InicioView
      greeting={saludo(HOY)}
      now={HOY.toISOString()}
      profile={demoProfile}
      stats={demoStats}
      collabs={demoCollabs}
      tasks={demoTasks}
      highlight={demoHighlight}
      notices={demoNotices}
      links={demoLinks}
    />
  )
}
