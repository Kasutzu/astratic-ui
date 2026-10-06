"use client"

import * as React from "react"
import type { Collab, Contacto, Interaccion, Marca, MediaKit, Perfil, Plantilla, Propuesta, Tarea } from "@/lib/influencer/modelo"
import { contactoDePropuesta, resumenesDeMarcas, type DatosCrm } from "@/lib/influencer/crm"
import { guardarBorrador } from "@/lib/influencer/borradores"
import { idNuevo } from "@/lib/influencer/tareas"

export type DatosIniciales = {
  hoy: string
  perfil: Perfil
  marcas: Marca[]
  contactos: Contacto[]
  propuestas: Propuesta[]
  interacciones: Interaccion[]
  plantillas: Plantilla[]
  mediaKit: MediaKit
  tareas: Tarea[]
  collabs: Collab[]
  marcasTrabajadas: string[]
}

type Lista<T> = React.Dispatch<React.SetStateAction<T[]>>

type Crm = DatosIniciales & {
  setMarcas: Lista<Marca>
  setContactos: Lista<Contacto>
  setPropuestas: Lista<Propuesta>
  setInteracciones: Lista<Interaccion>
  setPlantillas: Lista<Plantilla>
  setTareas: Lista<Tarea>
  setMediaKit: (kit: MediaKit) => void
  actualizarPropuesta: (id: string, cambios: Partial<Propuesta>) => void
  /** Apunta un email, mensaje o llamada en el seguimiento y mueve el último contacto. */
  apuntar: (i: Omit<Interaccion, "id" | "el">) => Interaccion
  /** Deja la propuesta lista para abrir su documento en otra pestaña (ver `lib/influencer/borradores.ts`). */
  publicarDocumento: (p: Propuesta) => void
  datos: DatosCrm
  resumenes: ReturnType<typeof resumenesDeMarcas>
}

const CrmContext = React.createContext<Crm | null>(null)

/**
 * Los datos del CRM, compartidos por sus pestañas: lo que se crea en Marcas aparece en el
 * pipeline sin recargar. Aquí se guardan en memoria; en el portal, cada cambio llama a su server
 * action y el layout vuelve a cargar los datos.
 */
export function CrmProvider({ inicial, children }: { inicial: DatosIniciales; children: React.ReactNode }) {
  const [marcas, setMarcas] = React.useState(inicial.marcas)
  const [contactos, setContactos] = React.useState(inicial.contactos)
  const [propuestas, setPropuestas] = React.useState(inicial.propuestas)
  const [interacciones, setInteracciones] = React.useState(inicial.interacciones)
  const [plantillas, setPlantillas] = React.useState(inicial.plantillas)
  const [tareas, setTareas] = React.useState(inicial.tareas)
  const [mediaKit, setMediaKitState] = React.useState(inicial.mediaKit)
  const { hoy, perfil, collabs } = inicial

  const valor = React.useMemo<Crm>(() => {
    const datos: DatosCrm = { propuestas, collabs, contactos, interacciones, tarifas: perfil.tarifas }
    const actualizarPropuesta = (id: string, cambios: Partial<Propuesta>) => setPropuestas((ps) => ps.map((p) => (p.id === id ? { ...p, ...cambios } : p)))
    return {
      ...inicial,
      marcas,
      contactos,
      propuestas,
      interacciones,
      plantillas,
      tareas,
      mediaKit,
      setMarcas,
      setContactos,
      setPropuestas,
      setInteracciones,
      setPlantillas,
      setTareas,
      setMediaKit: (kit) => {
        setMediaKitState(kit)
        guardarBorrador("media-kit", kit)
      },
      actualizarPropuesta,
      apuntar: (i) => {
        const nueva: Interaccion = { ...i, id: idNuevo("i"), el: hoy }
        setInteracciones((is) => [nueva, ...is])
        if (i.propuestaId) actualizarPropuesta(i.propuestaId, { ultimoContacto: hoy })
        return nueva
      },
      publicarDocumento: (p) => {
        const marca = marcas.find((m) => m.id === p.marcaId)
        if (marca) guardarBorrador(`propuesta:${p.id}`, { propuesta: p, marca, contacto: contactoDePropuesta(p, contactos) })
      },
      datos,
      resumenes: resumenesDeMarcas(marcas, datos),
    }
  }, [inicial, hoy, perfil, collabs, marcas, contactos, propuestas, interacciones, plantillas, tareas, mediaKit])

  return <CrmContext.Provider value={valor}>{children}</CrmContext.Provider>
}

export function useCrm() {
  const crm = React.useContext(CrmContext)
  if (!crm) throw new Error("useCrm fuera de CrmProvider")
  return crm
}
