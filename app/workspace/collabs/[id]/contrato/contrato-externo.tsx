"use client"

import * as React from "react"
import { toast } from "sonner"
import { DownloadIcon, FileSignatureIcon, FileTextIcon, ListChecksIcon, PenLineIcon, Trash2Icon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_CONTRATO, estadoDe, type Contrato } from "@/lib/influencer/modelo"
import { CLAUSULAS_A_VIGILAR } from "@/lib/influencer/contratos"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Section, SectionBody, SectionHeader } from "@/components/app/section"
import { StatusBadge } from "@/components/app/status-badge"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { Firmas } from "@/components/influencer/firmas-contrato"

/**
 * El contrato que manda la marca: su PDF, la lista de cláusulas a vigilar antes de firmarlo y quién
 * lo ha firmado (fuera del portal, con su propia herramienta).
 */
export function ContratoExterno({ contrato, suNombre, contacto, hoy, onCambiar, onQuitar }: { contrato: Contrato; suNombre: string; contacto: string; hoy: string; onCambiar: (c: Contrato) => void; onQuitar: () => void }) {
  const [revisadas, setRevisadas] = React.useState<Set<string>>(() => new Set(contrato.estado === "firmado" ? CLAUSULAS_A_VIGILAR.map((c) => c.id) : []))
  const [quitando, setQuitando] = React.useState(false)
  const estado = estadoDe(ESTADOS_CONTRATO, contrato.estado)
  const externo = contrato.externo

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Section className="flex-none">
        <SectionHeader icon={ListChecksIcon} title="Antes de firmar" meta={`${revisadas.size} de ${CLAUSULAS_A_VIGILAR.length} revisadas`} />
        <SectionBody className="p-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {CLAUSULAS_A_VIGILAR.map((c) => (
              <li key={c.id}>
                <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors", revisadas.has(c.id) && "border-success/40 bg-success-soft/40")}>
                  <Checkbox checked={revisadas.has(c.id)} onCheckedChange={(v) => setRevisadas((s) => new Set(v === true ? [...s, c.id] : [...s].filter((x) => x !== c.id)))} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{c.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{c.detalle}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Si algo no cuadra, pídeselo a la marca antes de firmar: es más fácil ahora que con la campaña en marcha.</p>
        </SectionBody>
      </Section>

      <Section className="flex-none">
        <SectionHeader icon={FileSignatureIcon} title="Contrato de la marca" action={<StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>} />
        <SectionBody className="flex flex-col gap-4 p-4">
          {externo && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileTextIcon className="size-8 flex-none text-danger" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{externo.nombre}</span>
                <span className="block text-xs text-muted-foreground">{fmt.bytes(externo.tamano)} · PDF</span>
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Descargar" onClick={() => toast.success("Descarga preparada")}>
                <DownloadIcon />
              </Button>
            </div>
          )}
          <Firmas contrato={contrato} suNombre={suNombre} marca={contacto} />
          {contrato.estado !== "firmado" && (
            <Button
              disabled={revisadas.size < CLAUSULAS_A_VIGILAR.length}
              onClick={() => {
                onCambiar({ ...contrato, estado: "firmado", firmas: [{ lado: "influencer", nombre: suNombre, el: hoy }, { lado: "marca", nombre: contacto, el: hoy }], actualizadoEl: hoy })
                toast.success("Contrato marcado como firmado")
              }}
            >
              <PenLineIcon /> Marcar como firmado
            </Button>
          )}
          {contrato.estado !== "firmado" && revisadas.size < CLAUSULAS_A_VIGILAR.length && <p className="-mt-2 text-xs text-muted-foreground">Revisa antes la lista de la izquierda.</p>}
          <Button variant="ghost" size="sm" className="self-start text-danger hover:text-danger" onClick={() => setQuitando(true)}>
            <Trash2Icon /> Quitar este contrato
          </Button>
        </SectionBody>
      </Section>

      <ConfirmDialog open={quitando} onOpenChange={setQuitando} title="¿Quitar el contrato de la marca?" description="Se quita el PDF de esta collab. Podrás subir otro o hacer el tuyo desde una plantilla." confirmLabel="Quitar el contrato" destructive onConfirm={onQuitar} />
    </div>
  )
}
