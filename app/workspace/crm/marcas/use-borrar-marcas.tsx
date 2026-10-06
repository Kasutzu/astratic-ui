"use client"

import * as React from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useCrm } from "../crm-provider"

/**
 * Borrar marcas se lleva sus contactos, sus propuestas y su seguimiento. Las que tienen collabs no
 * se borran: son facturas y contenidos que deben quedar. El toast permite deshacerlo.
 */
export function useBorrarMarcas({ alBorrar }: { alBorrar?: () => void }) {
  const crm = useCrm()
  const { marcas, contactos, propuestas, interacciones, resumenes, setMarcas, setContactos, setPropuestas, setInteracciones } = crm
  const [ids, setIds] = React.useState<string[] | null>(null)

  const borrables = (ids ?? []).filter((id) => !resumenes.get(id)?.collabs)
  const conCollabs = (ids ?? []).length - borrables.length
  const nombres = borrables.map((id) => marcas.find((m) => m.id === id)?.nombre).filter(Boolean)
  const nContactos = contactos.filter((c) => borrables.includes(c.marcaId)).length
  const nPropuestas = propuestas.filter((p) => borrables.includes(p.marcaId)).length

  const confirmar = () => {
    if (borrables.length === 0) return
    const antes = { marcas, contactos, propuestas, interacciones }
    const fuera = (x: { marcaId: string }) => !borrables.includes(x.marcaId)
    setMarcas((ms) => ms.filter((m) => !borrables.includes(m.id)))
    setContactos((cs) => cs.filter(fuera))
    setPropuestas((ps) => ps.filter(fuera))
    setInteracciones((is) => is.filter(fuera))
    alBorrar?.()
    toast.success(borrables.length === 1 ? `${nombres[0]} eliminada` : `${borrables.length} marcas eliminadas`, {
      description: conCollabs ? `${conCollabs} con collabs no se han borrado.` : undefined,
      action: {
        label: "Deshacer",
        onClick: () => {
          setMarcas(antes.marcas)
          setContactos(antes.contactos)
          setPropuestas(antes.propuestas)
          setInteracciones(antes.interacciones)
        },
      },
    })
  }

  const dialogo = (
    <ConfirmDialog
      open={ids !== null}
      onOpenChange={(o) => !o && setIds(null)}
      title={borrables.length === 0 ? "No se puede eliminar" : borrables.length === 1 ? `¿Eliminar ${nombres[0]}?` : `¿Eliminar ${borrables.length} marcas?`}
      description={
        borrables.length === 0
          ? "Tiene collabs: sus contenidos y cobros tienen que quedar. Si ya no trabajas con ella, déjala como está."
          : `Se borran también ${nContactos} ${nContactos === 1 ? "contacto" : "contactos"}, ${nPropuestas} ${nPropuestas === 1 ? "propuesta" : "propuestas"} y su seguimiento.${conCollabs ? ` ${conCollabs} con collabs se quedan.` : ""}`
      }
      confirmLabel={borrables.length === 0 ? "Entendido" : "Eliminar"}
      destructive={borrables.length > 0}
      onConfirm={confirmar}
    />
  )

  return { pedir: (lista: string[]) => setIds(lista), dialogo }
}
