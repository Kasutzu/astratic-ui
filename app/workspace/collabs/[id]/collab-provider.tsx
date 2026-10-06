"use client"

import * as React from "react"
import type { Collab, Contrato, Factura, FormularioMarca, Informe, Marca, Material, Perfil, Pieza, Tarea } from "@/lib/influencer/modelo"

type Estado<T> = [T, React.Dispatch<React.SetStateAction<T>>]

export type DatosCollab = { collab: Collab; marca: Marca; perfil: Perfil; hoy: string; materiales: Material[]; tareas: Tarea[]; formularios: FormularioMarca[]; facturas: Factura[]; contrato: Contrato | null; informe: Informe }

type ContextoCollab = {
  collab: Collab
  setCollab: React.Dispatch<React.SetStateAction<Collab>>
  /** Cambia una pieza de la collab sin tocar las demás. */
  setPieza: (id: string, cambio: (p: Pieza) => Pieza) => void
  marca: Marca
  perfil: Perfil
  hoy: string
  materiales: Estado<Material[]>
  tareas: Estado<Tarea[]>
  formularios: Estado<FormularioMarca[]>
  facturas: Estado<Factura[]>
  contrato: Estado<Contrato | null>
  informe: Estado<Informe>
}

const Contexto = React.createContext<ContextoCollab | null>(null)

/**
 * El estado de la collab abierta, compartido por el brief de arriba y todas sus pestañas: lo que se
 * cambia en una se ve en las demás sin recargar. En el portal cada cambio llamará a su server action
 * y el layout recargará los datos.
 */
export function CollabProvider({ inicial, children }: { inicial: DatosCollab; children: React.ReactNode }) {
  const [collab, setCollab] = React.useState(inicial.collab)
  const materiales = React.useState(inicial.materiales)
  const tareas = React.useState(inicial.tareas)
  const formularios = React.useState(inicial.formularios)
  const facturas = React.useState(inicial.facturas)
  const contrato = React.useState(inicial.contrato)
  const informe = React.useState(inicial.informe)
  const setPieza = React.useCallback((id: string, cambio: (p: Pieza) => Pieza) => setCollab((c) => ({ ...c, piezas: c.piezas.map((p) => (p.id === id ? cambio(p) : p)) })), [])
  const valor = React.useMemo(
    () => ({ collab, setCollab, setPieza, marca: inicial.marca, perfil: inicial.perfil, hoy: inicial.hoy, materiales, tareas, formularios, facturas, contrato, informe }),
    [collab, setPieza, inicial.marca, inicial.perfil, inicial.hoy, materiales, tareas, formularios, facturas, contrato, informe],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useCollab() {
  const valor = React.useContext(Contexto)
  if (!valor) throw new Error("useCollab va dentro de CollabProvider")
  return valor
}
