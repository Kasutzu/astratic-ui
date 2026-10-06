import type { Metadata } from "next"
import Link from "next/link"
import { ConstructionIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageBody } from "@/components/app/page-header"
import { EmptyState } from "@/components/app/states"
import { Block } from "@/components/influencer/block"

export const metadata: Metadata = { title: "En construcción" }

/** Las demás páginas del workspace llegan una a una, después de validar el Inicio. Hasta entonces, esta pantalla. */
export default async function SeccionPage({ params }: { params: Promise<{ seccion: string[] }> }) {
  const { seccion } = await params
  const nombre = seccion[0] ?? ""
  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <Block className="min-h-[60vh] justify-center">
        <EmptyState
          icon={ConstructionIcon}
          title={`«${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}» llega después del Inicio`}
          description="En la demo del design system solo está construida la página de Inicio. Las demás se diseñan con él una vez validado."
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
