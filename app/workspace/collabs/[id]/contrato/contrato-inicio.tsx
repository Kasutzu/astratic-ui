"use client"

import { FilePlus2Icon, FileSignatureIcon } from "lucide-react"
import type { PlantillaContrato } from "@/lib/influencer/modelo"
import { Section, SectionBody, SectionHeader } from "@/components/app/section"
import { ZonaSubida } from "@/components/influencer/zona-subida"

/**
 * Sin contrato todavía: empezar desde una plantilla (se rellena con los datos de la collab), en
 * blanco, o subir el contrato que manda la marca para revisarlo.
 */
export function ContratoInicio({ plantillas, onPlantilla, onSubir }: { plantillas: PlantillaContrato[]; onPlantilla: (p: PlantillaContrato | null) => void; onSubir: (archivo: File) => void }) {
  return (
    <Section className="flex-none">
      <SectionHeader icon={FileSignatureIcon} title="Contrato" meta="Aún no hay contrato para esta collab" />
      <SectionBody className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-sm font-semibold">Hazlo desde una plantilla</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Sale con la marca, tus datos, las piezas, las fechas, el importe y las condiciones del brief ya puestos.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {plantillas.map((p) => (
              <button key={p.id} type="button" onClick={() => onPlantilla(p)} className="rounded-xl border p-3 text-left transition-colors hover:border-brand hover:bg-brand-soft">
                <span className="text-sm font-medium">{p.nombre}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{p.descripcion}</span>
              </button>
            ))}
            <button type="button" onClick={() => onPlantilla(null)} className="rounded-xl border border-dashed p-3 text-left transition-colors hover:border-brand hover:bg-brand-soft">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <FilePlus2Icon className="size-4" /> En blanco
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Un documento vacío, con las variables a mano</span>
            </button>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">¿Te lo manda la marca?</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Súbelo y revísalo con la lista de cláusulas que conviene vigilar antes de firmar.</p>
          <ZonaSubida className="mt-3" accept="application/pdf" multiple={false} titulo="Sube el PDF de la marca" onArchivos={(fs) => fs[0] && onSubir(fs[0])} />
        </div>
      </SectionBody>
    </Section>
  )
}
