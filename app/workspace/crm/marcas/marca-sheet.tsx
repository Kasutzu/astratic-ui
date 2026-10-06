"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CopyIcon, EllipsisIcon, GlobeIcon, KanbanSquareIcon, MailIcon, PlusIcon, SparklesIcon, Trash2Icon, UserPlusIcon, UsersIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { ESTADOS_COLLAB, ESTADOS_PROPUESTA, RELACIONES_MARCA, estadoDe, type Marca, type UsoPlantilla } from "@/lib/influencer/modelo"
import { importeDe, textoAtribucion } from "@/lib/influencer/crm"
import { tareasDe } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/app/status-badge"
import { SocialIcon } from "@/components/app/social-icons"
import { DetailBody, DetailField, DetailFields, DetailFooter, DetailHeader, DetailLinks, DetailMeta, DetailSection, DetailSectionAction, DetailSheet, DetailSummary, RecordPager } from "@/components/app/detail-sheet"
import { InlineField, InlineTitle, type ValorInline } from "@/components/app/inline-field"
import { InsightList } from "@/components/app/insights-panel"
import { AvatarInitials } from "@/components/app/avatar-initials"
import { BrandMark } from "@/components/influencer/brand-mark"
import { TaskTable } from "@/components/influencer/task-table"
import { useCrm } from "../crm-provider"
import { Seguimiento } from "../seguimiento"
import { EscribirDialog } from "../escribir"
import { NuevaPropuestaDialog } from "../nueva-propuesta-dialog"
import { ContactoDialog } from "../contactos/contacto-dialog"

const Instagram = (p: { className?: string }) => <SocialIcon network="instagram" {...p} />

/** La ficha de una marca: su gente, sus propuestas y collabs, el seguimiento y sus datos. */
export function MarcaSheet({ lista, abiertaId, abrir, onBorrar }: { lista: Marca[]; abiertaId: string | null; abrir: (id: string | null) => void; onBorrar: (id: string) => void }) {
  const router = useRouter()
  const { marcas, setMarcas, contactos, propuestas, setPropuestas, collabs, resumenes, perfil, tareas, setTareas, hoy } = useCrm()
  const [dialogo, setDialogo] = React.useState<"propuesta" | "contacto" | "escribir" | null>(null)
  const marca = abiertaId ? (marcas.find((m) => m.id === abiertaId) ?? null) : null
  const posicion = marca ? lista.findIndex((m) => m.id === marca.id) : -1

  const guardar = (campo: keyof Marca) => async (v: ValorInline) => {
    if (marca) setMarcas((ms) => ms.map((m) => (m.id === marca.id ? { ...m, [campo]: v === "" || v === null ? undefined : v } : m)))
  }

  // Una función que devuelve JSX, no un componente: así no se vuelve a montar en cada pintado.
  function pintarFicha(m: Marca) {
    const resumen = resumenes.get(m.id)
    const relacion = estadoDe(RELACIONES_MARCA, resumen?.relacion ?? "sin-propuestas")
    const gente = contactos.filter((c) => c.marcaId === m.id).sort((a, b) => Number(b.principal ?? false) - Number(a.principal ?? false))
    const suyas = propuestas.filter((p) => p.marcaId === m.id).sort((a, b) => b.creadaEl.localeCompare(a.creadaEl))
    const susCollabs = collabs.filter((c) => c.marcaId === m.id)
    const relacionTarea = { tipo: "marca" as const, id: m.id, label: m.nombre }
    const tareasMarca = tareasDe(tareas, relacionTarea)
    const pendientes = tareasMarca.filter((t) => !t.hecha).length

    return (
      <>
        <DetailHeader
          leading={<BrandMark name={m.nombre} tint={m.tint} size="lg" />}
          title={<InlineTitle parts={[{ key: "nombre", value: m.nombre, placeholder: "Nombre", required: true }]} onSave={async (v) => guardar("nombre")(v.nombre ?? m.nombre)} />}
          subtitle={`${m.sector || "Sin sector"} · ${textoAtribucion(m)}`}
          status={<StatusBadge tone={relacion.tone}>{relacion.label}</StatusBadge>}
          nav={<RecordPager index={posicion} total={lista.length} label="marca" onPrev={() => abrir(lista[posicion - 1].id)} onNext={() => abrir(lista[posicion + 1].id)} />}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setDialogo("propuesta")}><PlusIcon /> Nueva propuesta</Button>
              <Button variant="outline" size="sm" onClick={() => setDialogo("escribir")}><MailIcon /> Escribir</Button>
              <Button variant="outline" size="sm" onClick={() => setDialogo("contacto")}><UserPlusIcon /> Nuevo contacto</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Más acciones" className="ml-auto"><EllipsisIcon /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/workspace/crm/marcas?registro=${m.id}`)
                      toast.success("Enlace copiado")
                    }}
                  >
                    <CopyIcon /> Copiar enlace
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onBorrar(m.id)}><Trash2Icon /> Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <DetailSummary>
          <DetailLinks
            links={[
              { key: "web", label: "Web", icon: GlobeIcon, href: m.web ?? null, title: m.web?.replace(/^https?:\/\//, "") },
              { key: "instagram", label: "Instagram", icon: Instagram, href: m.instagram ? `https://instagram.com/${m.instagram}` : null, title: m.instagram ? `@${m.instagram}` : undefined },
            ]}
            editor={
              <DetailFields>
                <DetailField label="Web"><InlineField value={m.web ?? null} tipo="url" placeholder="Añadir web" onSave={guardar("web")} /></DetailField>
                <DetailField label="Instagram"><InlineField value={m.instagram ?? null} placeholder="Añadir usuario" onSave={async (v) => guardar("instagram")(v ? String(v).replace(/^@/, "") : null)} /></DetailField>
              </DetailFields>
            }
          >
            {resumen?.ultimoContacto && <span className="text-xs text-muted-foreground">Último contacto {fmt.date(resumen.ultimoContacto)}</span>}
          </DetailLinks>
          <DetailFields columns={2}>
            <DetailField label="Sector" empty={!m.sector}>
              <InlineField value={m.sector || null} placeholder="Añadir sector" onSave={async (v) => guardar("sector")(v ?? "")} />
            </DetailField>
            <DetailField label="De quién es">
              <InlineField
                value={m.atribucion}
                tipo="select"
                required
                opciones={[{ value: "propia", label: "Mía" }, { value: "red", label: "De la red" }]}
                onSave={async (v) => setMarcas((ms) => ms.map((x) => (x.id === m.id ? { ...x, atribucion: v === "red" ? "red" : "propia", atribucionHasta: v === "red" ? undefined : (x.atribucionHasta ?? soloFecha(hoy)) } : x)))}
                render={() => (m.atribucion === "red" ? "De la red" : m.atribucionHasta ? `Tuya · ${fmt.date(m.atribucionHasta)}` : "Tuya")}
              />
            </DetailField>
            <DetailField label="Abiertas">
              <InlineField value={resumen?.valorAbierto ?? 0} readOnly onSave={async () => undefined} render={() => (resumen?.propuestasAbiertas ? <span className="tabular-nums">{resumen.propuestasAbiertas} · <span className="font-semibold">{fmt.eur(resumen.valorAbierto)}</span></span> : <span className="text-muted-foreground">Ninguna</span>)} />
            </DetailField>
            <DetailField label="Facturado">
              <InlineField value={resumen?.facturado ?? 0} readOnly onSave={async () => undefined} render={() => <span className="tabular-nums">{fmt.eur(resumen?.facturado ?? 0)} <span className="text-xs text-muted-foreground">· {resumen?.collabs ?? 0} collabs</span></span>} />
            </DetailField>
          </DetailFields>
        </DetailSummary>

        <Tabs defaultValue="resumen" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="resumen" className="flex-none">Resumen</TabsTrigger>
            <TabsTrigger value="seguimiento" className="flex-none">Seguimiento</TabsTrigger>
            <TabsTrigger value="datos" className="flex-none">Datos</TabsTrigger>
            <TabsTrigger value="tareas" className="flex-none">Tareas{pendientes ? ` · ${pendientes}` : ""}</TabsTrigger>
          </TabsList>
          <DetailBody>
            <TabsContent value="resumen">
              <DetailSection title="Contactos" icon={UsersIcon} count={gente.length} action={<DetailSectionAction onClick={() => setDialogo("contacto")}>Añadir</DetailSectionAction>}>
                {gente.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin contactos. Añade a quien lleva las colaboraciones para poder escribirle.</p>
                ) : (
                  <ul className="-my-1 flex flex-col divide-y">
                    {gente.map((c) => (
                      <li key={c.id} className="flex items-center gap-2.5 py-1.5">
                        <AvatarInitials name={c.nombre} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5">
                            <Link href={`/workspace/crm/contactos?registro=${c.id}`} className="flex-none text-[13px] font-medium hover:underline">{c.nombre}</Link>
                            {c.cargo && <span className="truncate text-xs text-muted-foreground">{c.cargo}</span>}
                            {c.principal && <span className="flex-none text-[11px] text-brand">principal</span>}
                          </div>
                          {c.email ? (
                            <button
                              type="button"
                              title="Copiar el email"
                              className="block max-w-full truncate rounded-sm text-left text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                              onClick={async () => {
                                await navigator.clipboard.writeText(c.email ?? "")
                                toast.success("Email copiado")
                              }}
                            >
                              {c.email}
                            </button>
                          ) : (
                            <span className="text-xs text-warning">{c.instagram ? `Solo Instagram: @${c.instagram}` : "Sin email"}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>
              {suyas.length > 0 && (
                <DetailSection title="Propuestas" icon={KanbanSquareIcon} count={suyas.length} collapsible storageKey="ws-marca.propuestas" summary={`${fmt.eur(resumen?.valorAbierto ?? 0)} abiertos`} action={<DetailSectionAction onClick={() => setDialogo("propuesta")}>Añadir</DetailSectionAction>}>
                  <InsightList
                    items={suyas.map((p) => {
                      const e = estadoDe(ESTADOS_PROPUESTA, p.estado)
                      return { key: p.id, title: <Link href={`/workspace/crm?registro=${p.id}`} className="hover:underline">{p.campana}</Link>, subtitle: importeDe(p, perfil.tarifas) ? fmt.eur(importeDe(p, perfil.tarifas)) : "Sin importe", trailing: <StatusBadge tone={e.tone}>{e.label}</StatusBadge> }
                    })}
                  />
                </DetailSection>
              )}
              {susCollabs.length > 0 && (
                <DetailSection title="Collabs" icon={SparklesIcon} count={susCollabs.length} collapsible storageKey="ws-marca.collabs" summary={fmt.eur(resumen?.facturado ?? 0)}>
                  <InsightList
                    items={susCollabs.map((c) => {
                      const e = estadoDe(ESTADOS_COLLAB, c.estado)
                      return { key: c.id, title: <Link href={`/workspace/collabs/${c.id}`} className="hover:underline">{c.campana}</Link>, subtitle: `${fmt.eur(c.importe)} · ${fmt.date(c.desde)}`, trailing: <StatusBadge tone={e.tone}>{e.label}</StatusBadge> }
                    })}
                  />
                </DetailSection>
              )}
            </TabsContent>
            <TabsContent value="seguimiento" className="px-4 py-3">
              <Seguimiento filtro={(i) => i.marcaId === m.id} nueva={{ marcaId: m.id, contactoId: resumen?.principal?.id }} />
            </TabsContent>
            <TabsContent value="datos">
              <div className="px-4 py-3">
                <DetailFields>
                  {m.atribucion === "propia" && (
                    <DetailField key="hasta" label="Tuya hasta" empty={!m.atribucionHasta}>
                      <InlineField value={m.atribucionHasta ?? null} tipo="fecha" onSave={guardar("atribucionHasta")} render={(v) => (v ? fmt.dateLong(String(v)) : "")} />
                    </DetailField>
                  )}
                  <DetailField key="notas" label="Notas" empty={!m.notas}>
                    <InlineField value={m.notas ?? null} tipo="textarea" multiline={4} placeholder="«Pagan tarde», «piden el guion antes»…" onSave={guardar("notas")} />
                  </DetailField>
                </DetailFields>
              </div>
              <DetailMeta>Añadida el {fmt.dateLong(m.creadaEl)}</DetailMeta>
            </TabsContent>
            <TabsContent value="tareas" className="py-2">
              <TaskTable
                tareas={tareasMarca}
                hoy={soloFecha(hoy)}
                relacionFija={relacionTarea}
                onToggle={(id) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)))}
                onUpdate={(t) => setTareas((ts) => ts.map((x) => (x.id === t.id ? t : x)))}
                onCreate={(t) => setTareas((ts) => [...ts, t])}
                onDelete={(ids) => setTareas((ts) => ts.filter((t) => !ids.includes(t.id)))}
              />
            </TabsContent>
          </DetailBody>
        </Tabs>

        <DetailFooter>
          <Button variant="ghost" onClick={() => abrir(null)}>Cerrar</Button>
          <Button onClick={() => setDialogo("propuesta")}><PlusIcon /> Nueva propuesta</Button>
        </DetailFooter>
      </>
    )
  }

  const usoSugerido: UsoPlantilla | undefined = marca && resumenes.get(marca.id)?.relacion === "sin-propuestas" ? "primer-contacto" : undefined

  return (
    <>
      <DetailSheet open={marca !== null} onOpenChange={(o) => !o && abrir(null)}>
        {marca && <React.Fragment key={marca.id}>{pintarFicha(marca)}</React.Fragment>}
      </DetailSheet>
      <NuevaPropuestaDialog
        open={dialogo === "propuesta"}
        onOpenChange={(o) => !o && setDialogo(null)}
        marcaInicial={marca?.id}
        onCreate={(p) => {
          setPropuestas((ps) => [p, ...ps])
          toast.success("Propuesta creada", { action: { label: "Ver en el pipeline", onClick: () => router.push(`/workspace/crm?registro=${p.id}`) } })
        }}
      />
      <ContactoDialog open={dialogo === "contacto"} onOpenChange={(o) => !o && setDialogo(null)} marcaFija={marca?.id} onCreado={(c) => toast.success(`${c.nombre} añadido a ${marca?.nombre ?? "la marca"}`)} />
      <EscribirDialog open={dialogo === "escribir"} onOpenChange={(o) => !o && setDialogo(null)} marca={marca} uso={usoSugerido} />
    </>
  )
}
