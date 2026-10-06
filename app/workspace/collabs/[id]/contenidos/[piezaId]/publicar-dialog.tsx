"use client"

import * as React from "react"
import { MegaphoneIcon } from "lucide-react"
import type { Pieza } from "@/lib/influencer/modelo"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Marcar una pieza como publicada: el enlace, el día y la confirmación de que va marcada como
 * publicidad (Código de Autocontrol). A los 7 días tocan los resultados.
 */
export function PublicarDialog({ open, onOpenChange, hoy, onPublicar }: { open: boolean; onOpenChange: (o: boolean) => void; hoy: string; onPublicar: (p: NonNullable<Pieza["publicada"]>) => void }) {
  const [url, setUrl] = React.useState("")
  const [fecha, setFecha] = React.useState(soloFecha(hoy))
  const [publi, setPubli] = React.useState(false)
  const urlValida = /^https?:\/\/\S+\.\S+/.test(url.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Marcar como publicada</DialogTitle>
          <DialogDescription>Queda en la collab con su enlace. En 7 días te tocará apuntar los resultados para el informe de la marca.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="pb-url">Enlace a la publicación</FieldLabel>
            <Input id="pb-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" autoFocus />
          </Field>
          <Field>
            <FieldLabel htmlFor="pb-fecha">Fecha</FieldLabel>
            <Input id="pb-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <label className="flex items-start gap-2.5 rounded-xl border p-3 text-sm">
            <Checkbox checked={publi} onCheckedChange={(c) => setPubli(c === true)} className="mt-0.5" />
            <span>
              <span className="font-medium">Va marcada como publicidad</span>
              <span className="block text-xs text-muted-foreground">Con «publi», «publicidad» o la etiqueta de colaboración pagada de la red. «#ad» no vale en español.</span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!urlValida || !publi || !fecha}
            onClick={() => {
              onPublicar({ url: url.trim(), fecha, marcadaPubli: true })
              onOpenChange(false)
            }}
          >
            <MegaphoneIcon /> Marcar como publicada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
