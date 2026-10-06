"use client"

import * as React from "react"
import Image from "next/image"
import { XIcon } from "lucide-react"
import { LISTA_METRICAS, METRICAS, type Metrica, type Pieza, type Resultado } from "@/lib/influencer/modelo"
import { idNuevo } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ZonaSubida } from "@/components/influencer/zona-subida"

/**
 * Apuntar los resultados de una pieza publicada: sus cifras a mano y las capturas de las
 * estadísticas de la red. Con la API de Instagram y TikTok entrarán solas.
 */
export function ResultadoDialog({ open, onOpenChange, pieza, resultado, hoy, onGuardar }: { open: boolean; onOpenChange: (o: boolean) => void; pieza: Pieza; resultado: Resultado | null; hoy: string; onGuardar: (r: Resultado) => void }) {
  const [medidoEl, setMedidoEl] = React.useState(soloFecha(resultado?.medidoEl ?? hoy))
  const [cifras, setCifras] = React.useState<Partial<Record<Metrica, string>>>(() => Object.fromEntries(LISTA_METRICAS.map((m) => [m, resultado?.metricas[m]?.toString() ?? ""])))
  const [capturas, setCapturas] = React.useState(resultado?.capturas ?? [])
  const [nota, setNota] = React.useState(resultado?.nota ?? "")
  const algunaCifra = LISTA_METRICAS.some((m) => cifras[m]?.trim())

  const guardar = () => {
    const metricas = Object.fromEntries(LISTA_METRICAS.flatMap((m) => (cifras[m]?.trim() ? [[m, Math.max(0, Math.round(Number(cifras[m]) || 0))]] : [])))
    onGuardar({ id: resultado?.id ?? idNuevo("res"), piezaId: pieza.id, medidoEl: `${medidoEl}T10:00:00`, metricas, capturas, nota: nota.trim() || undefined })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Resultados · {pieza.titulo}</DialogTitle>
          <DialogDescription>Copia las cifras de las estadísticas de la red y sube las capturas: la marca las ve en el informe tal cual.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field className="sm:max-w-[200px]">
            <FieldLabel htmlFor="rs-fecha">Medido el</FieldLabel>
            <Input id="rs-fecha" type="date" value={medidoEl} onChange={(e) => setMedidoEl(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LISTA_METRICAS.map((m) => (
              <Field key={m}>
                <FieldLabel htmlFor={`rs-${m}`} className="text-xs">
                  {METRICAS[m]}
                </FieldLabel>
                <Input id={`rs-${m}`} type="number" min={0} inputMode="numeric" value={cifras[m] ?? ""} onChange={(e) => setCifras((c) => ({ ...c, [m]: e.target.value }))} className="tabular-nums" />
              </Field>
            ))}
          </div>
          <Field>
            <FieldLabel>Capturas de las estadísticas</FieldLabel>
            {capturas.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {capturas.map((c) => (
                  <li key={c.id} className="relative h-28 w-16 overflow-hidden rounded-lg border bg-muted">
                    <Image src={c.url} alt={c.nombre} fill sizes="64px" className="object-cover" unoptimized />
                    <Button type="button" variant="secondary" size="icon-xs" aria-label={`Quitar ${c.nombre}`} className="absolute top-1 right-1" onClick={() => setCapturas((cs) => cs.filter((x) => x.id !== c.id))}>
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {/* Solo en este repo: las capturas se quedan en el navegador; en el portal suben a R2. */}
            <ZonaSubida compacta accept="image/*" titulo="Arrastra aquí las capturas o elígelas" onArchivos={(fs) => setCapturas((cs) => [...cs, ...fs.map((f) => ({ id: idNuevo("cap"), nombre: f.name, url: URL.createObjectURL(f) }))])} />
          </Field>
          <Field>
            <FieldLabel htmlFor="rs-nota">Nota</FieldLabel>
            <Textarea id="rs-nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Medido a los 7 días; los guardados siguen subiendo." />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!algunaCifra && capturas.length === 0}>
            Guardar resultados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
