import type { Metadata } from "next"
import Link from "next/link"
import { ConstructionIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageBody } from "@/components/app/page-header"
import { EmptyState } from "@/components/app/states"
import { Block } from "@/components/influencer/block"

export const metadata: Metadata = { title: "En construcción" }

const NOMBRES: Record<string, string> = {
  tareas: "Tareas",
  contenidos: "Contenidos",
  cobros: "Cobros",
  perfil: "Perfil y tarifas",
  biblia: "Biblia",
  ajustes: "Ajustes",
  avisos: "Avisos",
}

const DESCRIPCIONES: Record<string, string> = {
  tareas: "La página general de tareas, al estilo de Notion: todas las de todas las collabs y propuestas, más las tuyas, con calendario. Hasta que llegue, cada collab y cada propuesta tienen las suyas en su ficha.",
  contenidos: "La biblioteca con todas las piezas de todas las collabs por estado. Hasta que llegue, cada collab tiene su pestaña de Contenidos.",
  cobros: "Pendiente, vencido y cobrado, con los datos listos para facturar. Hasta que llegue, el cobro de cada collab está en su resumen.",
}

/** Las páginas que aún no están construidas llegan una a una; hasta entonces, esta pantalla dice qué serán. */
export default async function SeccionPage({ params }: { params: Promise<{ seccion: string[] }> }) {
  const { seccion } = await params
  const clave = seccion[0] ?? ""
  const nombre = NOMBRES[clave] ?? `${clave.charAt(0).toUpperCase()}${clave.slice(1)}`
  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <Block className="min-h-[60vh] justify-center">
        <EmptyState
          icon={ConstructionIcon}
          title={`«${nombre}» está por construir`}
          description={DESCRIPCIONES[clave] ?? "Construidas hasta ahora: Inicio, Propuestas y Collabs con su ficha completa. Esta llega después."}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/workspace">Volver al Inicio</Link>
            </Button>
          }
        />
      </Block>
    </PageBody>
  )
}
