import type { Metadata } from "next"
import { PlantillaEditor } from "./plantilla-editor"

export const metadata: Metadata = { title: "Plantilla · CRM" }

/** Una plantilla abierta: el editor a la izquierda y cómo le llega a una marca a la derecha. */
export default async function PlantillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlantillaEditor id={id} />
}
