"use client"

import * as React from "react"
import { MailIcon, MessageCircleIcon, MessageSquareTextIcon, PhoneIcon, StickyNoteIcon, UsersIcon, type LucideIcon } from "lucide-react"
import { TIPOS_INTERACCION, type Interaccion, type TipoInteraccion } from "@/lib/influencer/modelo"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { InteractionLog, type LogEntry } from "@/components/app/interaction-log"
import { useCrm } from "./crm-provider"

const ICONOS: Record<TipoInteraccion, LucideIcon> = {
  email: MailIcon,
  dm: MessageCircleIcon,
  whatsapp: MessageSquareTextIcon,
  llamada: PhoneIcon,
  reunion: UsersIcon,
  nota: StickyNoteIcon,
}

/** Los botones de apuntar, en el orden en que más se usan. */
const BOTONES: TipoInteraccion[] = ["email", "dm", "whatsapp", "llamada", "nota"]

/**
 * El seguimiento de una propuesta, una marca o una persona: cada email, mensaje o llamada con su
 * fecha. Cada botón crea la entrada al pulsarlo con la fecha de hoy y la nota se escribe después.
 */
export function Seguimiento({ filtro, nueva }: { filtro: (i: Interaccion) => boolean; nueva: Pick<Interaccion, "marcaId" | "contactoId" | "propuestaId"> }) {
  const { interacciones, contactos, perfil, apuntar, setInteracciones } = useCrm()
  const [recien, setRecien] = React.useState<string | null>(null)
  const [borrando, setBorrando] = React.useState<LogEntry | null>(null)

  const entradas = interacciones
    .filter(filtro)
    .sort((a, b) => b.el.localeCompare(a.el))
    .map<LogEntry>((i) => {
      const persona = contactos.find((c) => c.id === i.contactoId)?.nombre
      const titulo = i.tipo === "nota" ? "Nota" : `${TIPOS_INTERACCION[i.tipo]} ${i.sentido === "enviado" ? "enviado" : "recibido"}`
      return {
        id: i.id,
        title: persona && i.tipo !== "nota" ? `${titulo} · ${persona}` : titulo,
        date: i.el,
        note: i.nota ?? null,
        author: i.sentido === "enviado" ? perfil.nombrePila : (persona ?? "La marca"),
        icon: ICONOS[i.tipo],
        tone: i.sentido === "recibido" ? "info" : "neutral",
      }
    })

  return (
    <>
      <InteractionLog
        entries={entradas}
        autoEditId={recien}
        empty="Todavía no hay nada apuntado. Cada email, mensaje o llamada queda aquí con su fecha."
        actions={BOTONES.map((tipo) => {
          const Icono = ICONOS[tipo]
          return (
            <Button key={tipo} variant="outline" size="sm" onClick={() => setRecien(apuntar({ ...nueva, tipo, sentido: "enviado" }).id)}>
              <Icono /> {TIPOS_INTERACCION[tipo]}
            </Button>
          )
        })}
        onSaveNote={async (e, nota) => {
          setInteracciones((is) => is.map((i) => (i.id === e.id ? { ...i, nota: nota ?? undefined } : i)))
          setRecien(null)
        }}
        onDelete={setBorrando}
      />
      <ConfirmDialog
        open={borrando !== null}
        onOpenChange={(o) => !o && setBorrando(null)}
        title={`¿Eliminar «${String(borrando?.title ?? "")}»?`}
        description="Se quita del seguimiento, con su nota. No se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (borrando) setInteracciones((is) => is.filter((i) => i.id !== borrando.id))
        }}
      />
    </>
  )
}
