"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MOTIVOS_PERDIDA, ESTADOS_PROPUESTA, estadoDe, type EstadoPropuesta, type MotivoPerdida, type Propuesta, type UsoPlantilla } from "@/lib/influencer/modelo"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useCrm } from "./crm-provider"
import { NuevaPropuestaDialog } from "./nueva-propuesta-dialog"
import { PrepararPropuestaDialog } from "./preparar-propuesta-dialog"
import { EscribirDialog } from "./escribir"
import { useRegistroAbierto } from "./use-registro"

/** Escribir a una propuesta, con la plantilla que toca según su estado. */
export type Escribiendo = { propuesta: Propuesta; uso: UsoPlantilla }

/**
 * Lo que se hace con las propuestas del pipeline y sus diálogos: abrir la ficha (con `?registro=`
 * en la URL), crear, preparar el presupuesto, escribir con plantilla, cambiar de estado, perder y
 * eliminar. La vista pinta `dialogos` una vez.
 */
export function usePropuestaAcciones({ abiertaInicial, nuevaInicial, alCambiar }: { abiertaInicial: string | null; nuevaInicial: boolean; alCambiar?: () => void }) {
  const router = useRouter()
  const { propuestas, setPropuestas, setMarcas, marcas, hoy } = useCrm()
  const [abiertaId, abrir] = useRegistroAbierto(abiertaInicial)
  const [nueva, setNueva] = React.useState(nuevaInicial)
  const [preparando, setPreparando] = React.useState<Propuesta | null>(null)
  const [escribiendo, setEscribiendo] = React.useState<Escribiendo | null>(null)
  const [perdiendo, setPerdiendo] = React.useState<{ ids: string[]; motivo: MotivoPerdida | "" } | null>(null)
  const [borrando, setBorrando] = React.useState<Propuesta | null>(null)

  const nombreMarca = (p: Propuesta) => marcas.find((m) => m.id === p.marcaId)?.nombre ?? ""

  const cambiarEstado = (ids: string[], estado: EstadoPropuesta) => {
    if (estado === "perdida") return setPerdiendo({ ids, motivo: "" })
    setPropuestas((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, estado, ultimoContacto: hoy } : p)))
    alCambiar?.()
    const etiqueta = estadoDe(ESTADOS_PROPUESTA, estado).label
    if (estado === "ganada") {
      toast.success(ids.length === 1 ? "¡Propuesta ganada! Crea la collab con su brief y sus piezas" : `${ids.length} propuestas ganadas`, {
        action: { label: "Crear la collab", onClick: () => router.push("/workspace/collabs?nueva=1") },
      })
    } else toast.success(ids.length === 1 ? `Propuesta en «${etiqueta}»` : `${ids.length} propuestas en «${etiqueta}»`)
  }

  const confirmarPerdida = () => {
    if (!perdiendo) return
    const { ids, motivo } = perdiendo
    setPropuestas((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, estado: "perdida", motivoPerdida: motivo || undefined, ultimoContacto: hoy } : p)))
    setPerdiendo(null)
    alCambiar?.()
    toast.success(ids.length === 1 ? "Propuesta marcada como perdida" : `${ids.length} propuestas perdidas`)
  }

  const eliminar = (p: Propuesta) => {
    setPropuestas((ps) => ps.filter((x) => x.id !== p.id))
    abrir(null)
    toast.success(`Propuesta de ${nombreMarca(p)} eliminada`)
  }

  const dialogos = (
    <>
      <NuevaPropuestaDialog
        open={nueva}
        onOpenChange={setNueva}
        onCreate={(p, marcaNueva) => {
          if (marcaNueva) setMarcas((ms) => [...ms, marcaNueva])
          setPropuestas((ps) => [p, ...ps])
          abrir(p.id)
          toast.success("Propuesta creada")
        }}
      />
      <PrepararPropuestaDialog open={preparando !== null} propuesta={preparando} onOpenChange={(o) => !o && setPreparando(null)} />
      <EscribirDialog
        open={escribiendo !== null}
        onOpenChange={(o) => !o && setEscribiendo(null)}
        marca={escribiendo ? (marcas.find((m) => m.id === escribiendo.propuesta.marcaId) ?? null) : null}
        propuesta={escribiendo?.propuesta}
        uso={escribiendo?.uso}
        contactoInicial={escribiendo?.propuesta.contactoId}
      />
      <Dialog open={perdiendo !== null} onOpenChange={(o) => !o && setPerdiendo(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Marcar como perdida</DialogTitle>
            <DialogDescription>Apunta por qué: con el tiempo verás qué falla (precio, fechas, marcas que no encajan).</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="motivo-perdida">Motivo</FieldLabel>
            <Select value={perdiendo?.motivo ?? ""} onValueChange={(v) => setPerdiendo((s) => (s ? { ...s, motivo: v as MotivoPerdida } : s))}>
              <SelectTrigger id="motivo-perdida" className="w-full">
                <SelectValue placeholder="Elige el motivo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MOTIVOS_PERDIDA) as MotivoPerdida[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MOTIVOS_PERDIDA[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPerdiendo(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarPerdida}>Marcar perdida</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={borrando !== null}
        onOpenChange={(o) => !o && setBorrando(null)}
        title={`¿Eliminar la propuesta de ${borrando ? nombreMarca(borrando) : ""}?`}
        description="Se borra con sus tareas y su seguimiento. Si la marca ha dicho que no, mejor márcala como perdida: así queda el historial."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (borrando) eliminar(borrando)
        }}
      />
    </>
  )

  return {
    abiertaId,
    abierta: abiertaId ? (propuestas.find((p) => p.id === abiertaId) ?? null) : null,
    abrir,
    setNueva,
    preparar: setPreparando,
    escribir: (propuesta: Propuesta, uso: UsoPlantilla) => setEscribiendo({ propuesta, uso }),
    cambiarEstado,
    perder: (ids: string[]) => setPerdiendo({ ids, motivo: "" }),
    borrar: setBorrando,
    dialogos,
  }
}

export type AccionesPropuesta = ReturnType<typeof usePropuestaAcciones>
