"use client"

import * as React from "react"
import { toast } from "sonner"
import { PIEZA_VACIA, esquemaPiezaPedida, piezaNueva, type PiezaPedidaForm } from "@/lib/influencer/formularios"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PiezasEditor } from "@/components/influencer/piezas-editor"
import { useCollab } from "../collab-provider"

/** Añadir una o varias piezas a la collab: tipo, nombre libre, fecha, red e indicaciones. */
export function NuevaPiezaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { collab, setCollab } = useCollab()
  const [piezas, setPiezas] = React.useState<PiezaPedidaForm[]>([{ ...PIEZA_VACIA, publicacion: collab.hasta }])
  const [errores, setErrores] = React.useState<(string | undefined)[]>([])

  const cerrar = (o: boolean) => {
    onOpenChange(o)
    if (!o) {
      setPiezas([{ ...PIEZA_VACIA, publicacion: collab.hasta }])
      setErrores([])
    }
  }

  const crear = () => {
    const resultados = piezas.map((p) => esquemaPiezaPedida.safeParse(p))
    const fallos = resultados.map((r) => (r.success ? undefined : r.error.issues[0]?.message))
    if (fallos.some(Boolean)) return setErrores(fallos)
    const nuevas = piezas.map((p) => piezaNueva({ collabId: collab.id, tipo: p.tipo, titulo: p.titulo.trim(), publicacion: p.publicacion || collab.hasta, red: p.red, indicaciones: p.indicaciones.trim() }))
    setCollab((c) => ({ ...c, piezas: [...c.piezas, ...nuevas] }))
    toast.success(nuevas.length === 1 ? "Pieza añadida" : `${nuevas.length} piezas añadidas`)
    cerrar(false)
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Añadir piezas</DialogTitle>
          <DialogDescription>De la fecha de publicación salen el resto: guion 10 días antes, v1 5 días antes y resultados 7 días después.</DialogDescription>
        </DialogHeader>
        <PiezasEditor value={piezas} onChange={setPiezas} errores={errores} ventana={{ desde: collab.desde, hasta: collab.hasta }} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => cerrar(false)}>
            Cancelar
          </Button>
          <Button onClick={crear}>{piezas.length === 1 ? "Añadir pieza" : `Añadir ${piezas.length} piezas`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
