"use client"

import * as React from "react"
import { PenLineIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Firmar ella y mandar a la marca. Aceptación con registro (nombre, fecha y hora, y en el portal IP
 * y huella del documento): firma electrónica simple, válida para un contrato comercial.
 */
export function FirmarDialog({ open, onOpenChange, nombre: inicial, onFirmar }: { open: boolean; onOpenChange: (o: boolean) => void; nombre: string; onFirmar: (nombre: string) => void }) {
  const [nombre, setNombre] = React.useState(inicial)
  const [acepto, setAcepto] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Firmar y enviar a la marca</DialogTitle>
          <DialogDescription>Queda registrado tu nombre, la fecha y la hora. Después la marca recibe un enlace para leerlo y firmar; desde ese momento el texto ya no se edita.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="fr-nombre">Tu nombre completo</FieldLabel>
            <Input id="fr-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={acepto} onCheckedChange={(c) => setAcepto(c === true)} className="mt-0.5" />
            He leído el contrato y lo acepto.
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!acepto || !nombre.trim()}
            onClick={() => {
              onFirmar(nombre.trim())
              onOpenChange(false)
              setAcepto(false)
            }}
          >
            <PenLineIcon /> Firmar y crear el enlace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
