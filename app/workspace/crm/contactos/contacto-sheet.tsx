"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CopyIcon, EllipsisIcon, KanbanSquareIcon, MailIcon, PhoneIcon, StarIcon, Trash2Icon } from "lucide-react"
import { fmt } from "@/lib/format"
import { ESTADOS_PROPUESTA, estadoDe, type Contacto } from "@/lib/influencer/modelo"
import { contactoDePropuesta, importeDe, ultimoContactoDe } from "@/lib/influencer/crm"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/app/status-badge"
import { SocialIcon } from "@/components/app/social-icons"
import { DetailBody, DetailField, DetailFields, DetailFooter, DetailHeader, DetailLinks, DetailMeta, DetailSection, DetailSheet, DetailSummary, RecordPager } from "@/components/app/detail-sheet"
import { InlineField, InlineTitle, type ValorInline } from "@/components/app/inline-field"
import { InsightList } from "@/components/app/insights-panel"
import { AvatarInitials } from "@/components/app/avatar-initials"
import { useCrm } from "../crm-provider"
import { Seguimiento } from "../seguimiento"
import { EscribirDialog } from "../escribir"

const Instagram = (p: { className?: string }) => <SocialIcon network="instagram" {...p} />

/** La ficha de una persona: cómo escribirle, su marca, sus propuestas y lo hablado. */
export function ContactoSheet({ lista, abiertoId, abrir, onBorrar }: { lista: Contacto[]; abiertoId: string | null; abrir: (id: string | null) => void; onBorrar: (id: string) => void }) {
  const { contactos, setContactos, marcas, propuestas, interacciones, perfil } = useCrm()
  const [escribiendo, setEscribiendo] = React.useState(false)
  const contacto = abiertoId ? (contactos.find((c) => c.id === abiertoId) ?? null) : null
  const marca = contacto ? (marcas.find((m) => m.id === contacto.marcaId) ?? null) : null
  const posicion = contacto ? lista.findIndex((c) => c.id === contacto.id) : -1

  const guardar = (campo: keyof Contacto) => async (v: ValorInline) => {
    if (contacto) setContactos((cs) => cs.map((c) => (c.id === contacto.id ? { ...c, [campo]: v === "" || v === null ? undefined : v } : c)))
  }

  const hacerPrincipal = (c: Contacto) => {
    setContactos((cs) => cs.map((x) => (x.marcaId === c.marcaId ? { ...x, principal: x.id === c.id } : x)))
    toast.success(`${c.nombre} es ahora el contacto principal`)
  }

  // Una función que devuelve JSX, no un componente: así no se vuelve a montar en cada pintado.
  function pintarFicha(c: Contacto) {
    const suyas = propuestas.filter((p) => contactoDePropuesta(p, contactos)?.id === c.id)
    const ultimo = ultimoContactoDe(c.id, interacciones)
    return (
      <>
        <DetailHeader
          leading={<AvatarInitials name={c.nombre} size="lg" />}
          title={<InlineTitle parts={[{ key: "nombre", value: c.nombre, placeholder: "Nombre y apellidos", required: true }]} onSave={async (v) => guardar("nombre")(v.nombre ?? c.nombre)} />}
          subtitle={
            <>
              {c.cargo ? `${c.cargo} · ` : ""}
              {marca && <Link href={`/workspace/crm/marcas?registro=${marca.id}`} className="hover:underline">{marca.nombre}</Link>}
            </>
          }
          status={c.principal ? <StatusBadge tone="info">Principal</StatusBadge> : undefined}
          nav={<RecordPager index={posicion} total={lista.length} label="contacto" onPrev={() => abrir(lista[posicion - 1].id)} onNext={() => abrir(lista[posicion + 1].id)} />}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setEscribiendo(true)}><MailIcon /> Escribir</Button>
              {c.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(c.email ?? "")
                    toast.success("Email copiado")
                  }}
                >
                  <CopyIcon /> Copiar email
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Más acciones" className="ml-auto"><EllipsisIcon /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!c.principal && <DropdownMenuItem onSelect={() => hacerPrincipal(c)}><StarIcon /> Hacer contacto principal</DropdownMenuItem>}
                  <DropdownMenuItem
                    onSelect={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/workspace/crm/contactos?registro=${c.id}`)
                      toast.success("Enlace copiado")
                    }}
                  >
                    <CopyIcon /> Copiar enlace
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onBorrar(c.id)}><Trash2Icon /> Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <DetailSummary>
          <DetailLinks
            links={[
              { key: "email", label: "Email", icon: MailIcon, href: c.email ? `mailto:${c.email}` : null, title: c.email },
              { key: "telefono", label: "Teléfono", icon: PhoneIcon, href: c.telefono ? `tel:${c.telefono.replace(/\s/g, "")}` : null, title: c.telefono },
              { key: "instagram", label: "Instagram", icon: Instagram, href: c.instagram ? `https://instagram.com/${c.instagram}` : null, title: c.instagram ? `@${c.instagram}` : undefined },
            ]}
            editor={
              <DetailFields>
                <DetailField label="Email"><InlineField value={c.email ?? null} tipo="email" placeholder="Añadir email" onSave={guardar("email")} /></DetailField>
                <DetailField label="Teléfono"><InlineField value={c.telefono ?? null} tipo="telefono" placeholder="Añadir teléfono" onSave={guardar("telefono")} /></DetailField>
                <DetailField label="Instagram"><InlineField value={c.instagram ?? null} placeholder="Añadir usuario" onSave={async (v) => guardar("instagram")(v ? String(v).replace(/^@/, "") : null)} /></DetailField>
              </DetailFields>
            }
          >
            {c.email && <span className="truncate text-xs text-muted-foreground">{c.email}</span>}
          </DetailLinks>
          <DetailFields columns={2}>
            <DetailField label="Marca">
              <InlineField value={c.marcaId} tipo="select" required opciones={[...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((m) => ({ value: m.id, label: m.nombre }))} onSave={async (v) => guardar("marcaId")(v)} render={() => marca?.nombre ?? "—"} />
            </DetailField>
            <DetailField label="Cargo" empty={!c.cargo}>
              <InlineField value={c.cargo ?? null} placeholder="Añadir cargo" onSave={guardar("cargo")} />
            </DetailField>
            <DetailField label="Contactado">
              <InlineField value={ultimo ?? null} readOnly onSave={async () => undefined} render={() => (ultimo ? fmt.date(ultimo) : <span className="text-muted-foreground">Nunca</span>)} />
            </DetailField>
            <DetailField label="Principal">
              <InlineField value={!!c.principal} tipo="booleano" onSave={async (v) => (v ? hacerPrincipal(c) : guardar("principal")(false))} />
            </DetailField>
          </DetailFields>
        </DetailSummary>

        <Tabs defaultValue="seguimiento" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="seguimiento" className="flex-none">Seguimiento</TabsTrigger>
            <TabsTrigger value="datos" className="flex-none">Datos</TabsTrigger>
          </TabsList>
          <DetailBody>
            <TabsContent value="seguimiento">
              {suyas.length > 0 && (
                <DetailSection title="Propuestas" icon={KanbanSquareIcon} count={suyas.length} collapsible storageKey="ws-contacto.propuestas">
                  <InsightList
                    items={suyas.map((p) => {
                      const e = estadoDe(ESTADOS_PROPUESTA, p.estado)
                      return { key: p.id, title: <Link href={`/workspace/crm?registro=${p.id}`} className="hover:underline">{p.campana}</Link>, subtitle: importeDe(p, perfil.tarifas) ? fmt.eur(importeDe(p, perfil.tarifas)) : "Sin importe", trailing: <StatusBadge tone={e.tone}>{e.label}</StatusBadge> }
                    })}
                  />
                </DetailSection>
              )}
              <div className="px-4 py-3">
                <Seguimiento filtro={(i) => i.contactoId === c.id} nueva={{ marcaId: c.marcaId, contactoId: c.id }} />
              </div>
            </TabsContent>
            <TabsContent value="datos">
              <div className="px-4 py-3">
                <DetailFields>
                  <DetailField key="notas" label="Notas" empty={!c.notas}>
                    <InlineField value={c.notas ?? null} tipo="textarea" multiline={4} placeholder="«Prefiere WhatsApp», «contesta por la tarde»…" onSave={guardar("notas")} />
                  </DetailField>
                </DetailFields>
              </div>
              <DetailMeta>Añadido el {fmt.dateLong(c.creadoEl)}</DetailMeta>
            </TabsContent>
          </DetailBody>
        </Tabs>

        <DetailFooter>
          <Button variant="ghost" onClick={() => abrir(null)}>Cerrar</Button>
          <Button onClick={() => setEscribiendo(true)}><MailIcon /> Escribir</Button>
        </DetailFooter>
      </>
    )
  }

  return (
    <>
      <DetailSheet open={contacto !== null} onOpenChange={(o) => !o && abrir(null)}>
        {contacto && <React.Fragment key={contacto.id}>{pintarFicha(contacto)}</React.Fragment>}
      </DetailSheet>
      <EscribirDialog open={escribiendo} onOpenChange={setEscribiendo} marca={marca} contactoInicial={contacto?.id} />
    </>
  )
}
