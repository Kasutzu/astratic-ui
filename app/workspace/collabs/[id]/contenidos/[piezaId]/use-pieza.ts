"use client"

import type { Comentario, Pieza, TipoVersion, Version } from "@/lib/influencer/modelo"
import { caducidad, tokenNuevo } from "@/lib/influencer/formularios"
import { idNuevo } from "@/lib/influencer/tareas"
import { guardarBorrador } from "@/lib/influencer/borradores"
import { useCollab } from "../../collab-provider"

/**
 * Lo que se hace con una pieza y sus versiones: crear una versión, editarla mientras es borrador,
 * mandarla a revisión (crea el enlace de la marca), contestar y resolver notas, escribir a la marca
 * y publicar. Todo cambia el estado compartido de la collab; en el portal, cada acción es una server action.
 */
export function usePieza(piezaId: string) {
  const { collab, setPieza, marca, hoy, perfil } = useCollab()
  const pieza = collab.piezas.find((p) => p.id === piezaId) ?? null

  const cambiarPieza = (cambio: Partial<Pieza>) => setPieza(piezaId, (p) => ({ ...p, ...cambio }))

  const cambiarVersion = (parte: TipoVersion, versionId: string, cambio: (v: Version) => Version) => setPieza(piezaId, (p) => ({ ...p, [parte]: p[parte].map((v) => (v.id === versionId ? cambio(v) : v)) }))

  const crearVersion = (parte: TipoVersion, datos: Partial<Version>): Version | null => {
    if (!pieza) return null
    const numero = pieza[parte].length + 1
    const nueva: Version = { id: idNuevo(`${pieza.id}-${parte[0]}`), tipo: parte, numero, estado: "borrador", creadaEl: hoy, notas: [], mensajes: [], ...datos }
    setPieza(piezaId, (p) => ({ ...p, [parte]: [...p[parte], nueva], estado: "borrador", rondaActual: parte === "media" && numero > 1 ? p.rondaActual + 1 : p.rondaActual }))
    return nueva
  }

  /** Congela la versión, crea su enlace sin cuenta y devuelve la ruta para mandarla. */
  const enviarARevision = (parte: TipoVersion, version: Version) => {
    if (!pieza) return null
    const enviada: Version = { ...version, estado: "en-revision", creadaEl: hoy, enlace: { token: tokenNuevo("rv"), caduca: caducidad(hoy) } }
    const actualizada: Pieza = { ...pieza, estado: "en-revision", [parte]: pieza[parte].map((v) => (v.id === version.id ? enviada : v)) }
    setPieza(piezaId, () => actualizada)
    // Solo en este repo: la página de revisión de la otra pestaña lee del navegador lo recién enviado.
    guardarBorrador(`revision:${enviada.enlace?.token}`, { collab: { ...collab, piezas: collab.piezas.map((p) => (p.id === piezaId ? actualizada : p)) }, pieza: actualizada, version: enviada, tipo: parte, marca })
    return enviada
  }

  const comentario = (texto: string): Comentario => ({ id: idNuevo("cm"), autor: perfil.nombrePila, lado: "influencer", el: hoy, texto })

  const resolverNota = (parte: TipoVersion, versionId: string, notaId: string) => cambiarVersion(parte, versionId, (v) => ({ ...v, notas: v.notas.map((n) => (n.id === notaId ? { ...n, resuelta: !n.resuelta } : n)) }))

  const responderNota = (parte: TipoVersion, versionId: string, notaId: string, texto: string) => cambiarVersion(parte, versionId, (v) => ({ ...v, notas: v.notas.map((n) => (n.id === notaId ? { ...n, respuestas: [...n.respuestas, comentario(texto)] } : n)) }))

  const escribir = (parte: TipoVersion, versionId: string, texto: string) => cambiarVersion(parte, versionId, (v) => ({ ...v, mensajes: [...v.mensajes, comentario(texto)] }))

  const publicar = (publicada: NonNullable<Pieza["publicada"]>) => cambiarPieza({ publicada, estado: "publicado" })

  return { pieza, collab, marca, hoy, perfil, cambiarPieza, cambiarVersion, crearVersion, enviarARevision, resolverNota, responderNota, escribir, publicar }
}

export type AccionesPieza = ReturnType<typeof usePieza>
