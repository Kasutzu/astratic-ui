"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CopyIcon, EllipsisIcon, ExternalLinkIcon, FileTextIcon, MailIcon, MessageSquareIcon, SparklesIcon, ThumbsDownIcon, Trash2Icon, TriangleAlertIcon, TrophyIcon, UserIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import {
  ESTADOS_PROPUESTA,
  MOTIVOS_PERDIDA,
  ORIGENES,
  describirPiezas,
  estadoDe,
  type Actividad,
  type EstadoPropuesta,
  type Marca,
  type MotivoPerdida,
  type OrigenPropuesta,
  type Propuesta,
  type Tarea,
  type Tarifa,
} from "@/lib/influencer/modelo"
import { calcularPresupuesto, minimoDe } from "@/lib/influencer/presupuesto"
import { tareasDe } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/app/status-badge"
import { DetailBody, DetailField, DetailFields, DetailFooter, DetailHeader, DetailMeta, DetailSection, DetailSheet, RecordPager } from "@/components/app/detail-sheet"
import { InlineField, InlineTitle } from "@/components/app/inline-field"
import { InteractionLog, type LogEntry } from "@/components/app/interaction-log"
import { BrandMark } from "@/components/influencer/brand-mark"
import { TaskTable } from "@/components/influencer/task-table"
import { idNuevo } from "@/lib/influencer/tareas"

/** La ficha de una propuesta: se lee de un vistazo y cada dato se edita donde se lee. */
export function PropuestaSheet({
  propuesta,
  marca,
  tarifas,
  hoy,
  tareas,
  actividad,
  posicion,
  total,
  onClose,
  onPrev,
  onNext,
  onChange,
  onEstado,
  onPreparar,
  onDelete,
  onTareas,
}: {
  propuesta: Propuesta | null
  marca: Marca | null
  marcas: Marca[]
  tarifas: Tarifa[]
  hoy: string
  tareas: Tarea[]
  actividad: Actividad[]
  posicion: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onChange: (cambios: Partial<Propuesta>) => void
  onEstado: (estado: EstadoPropuesta) => void
  onPreparar: () => void
  onDelete: () => void
  onTareas: React.Dispatch<React.SetStateAction<Tarea[]>>
}) {
  const hoyFecha = soloFecha(hoy)
  const [apuntadas, setApuntadas] = React.useState<LogEntry[]>([])
  const [editandoNota, setEditandoNota] = React.useState<string | null>(null)
  const abierta = propuesta !== null && marca !== null

  const guardar = (campo: keyof Propuesta) => async (v: unknown) => {
    onChange({ [campo]: v === "" ? undefined : v })
  }

  const copiarEnlace = async () => {
    if (!propuesta) return
    await navigator.clipboard.writeText(`${window.location.origin}/workspace/propuestas?propuesta=${propuesta.id}`)
    toast.success("Enlace copiado")
  }

  const apuntarContacto = (titulo: string, icon: LogEntry["icon"]) => {
    const entrada: LogEntry = { id: idNuevo("act"), title: titulo, date: hoy, note: null, author: "Marta", icon }
    setApuntadas((as) => [entrada, ...as])
    setEditandoNota(entrada.id)
    onChange({ ultimoContacto: hoy })
  }

  const calculo = propuesta?.presupuesto ? calcularPresupuesto(propuesta.presupuesto, tarifas) : null
  const minimo = propuesta ? minimoDe(propuesta.piezas, tarifas) : 0
  const estado = propuesta ? estadoDe(ESTADOS_PROPUESTA, propuesta.estado) : null
  const relacion = propuesta && marca ? { tipo: "propuesta" as const, id: propuesta.id, label: `Propuesta · ${marca.nombre}` } : undefined
  const tareasPropuesta = propuesta ? tareasDe(tareas, { tipo: "propuesta", id: propuesta.id }) : []

  const entradas: LogEntry[] = [
    ...apuntadas,
    ...actividad
      .filter((a) => a.propuestaId === propuesta?.id)
      .map<LogEntry>((a) => ({ id: a.id, title: a.que, date: a.el, author: a.quien, icon: a.quien === "Astratic" ? SparklesIcon : a.quien === "Marta" ? UserIcon : MailIcon, locked: true })),
  ]

  return (
    <DetailSheet open={abierta} onOpenChange={(o) => !o && onClose()}>
      {propuesta && marca && estado && (
        <>
          <DetailHeader
            leading={<BrandMark name={marca.nombre} tint={marca.tint} size="lg" />}
            title={<InlineTitle parts={[{ key: "campana", value: propuesta.campana, placeholder: "Campaña", required: true }]} onSave={async (v) => onChange({ campana: v.campana ?? propuesta.campana })} />}
            subtitle={`${marca.nombre} · ${ORIGENES[propuesta.origen]}`}
            status={<StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>}
            nav={<RecordPager index={posicion} total={total} label="propuesta" onPrev={onPrev} onNext={onNext} />}
            actions={
              <>
                <Button variant="outline" size="sm" onClick={onPreparar}>
                  <FileTextIcon /> {propuesta.presupuesto ? "Rehacer propuesta" : "Preparar propuesta"}
                </Button>
                {propuesta.presupuesto && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/propuesta/${propuesta.id}`} target="_blank">
                      <ExternalLinkIcon /> Ver documento
                    </Link>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Más acciones" className="ml-auto">
                      <EllipsisIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEstado("ganada")} disabled={propuesta.estado === "ganada"}>
                      <TrophyIcon /> Marcar como ganada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEstado("perdida")} disabled={propuesta.estado === "perdida"}>
                      <ThumbsDownIcon /> Marcar como perdida
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={copiarEnlace}>
                      <CopyIcon /> Copiar enlace
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={onDelete}>
                      <Trash2Icon /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          />
          <Tabs key={propuesta.id} defaultValue="resumen" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
              <TabsTrigger value="resumen" className="flex-none">Resumen</TabsTrigger>
              <TabsTrigger value="tareas" className="flex-none">
                Tareas
                {tareasPropuesta.filter((t) => !t.hecha).length > 0 && <span className="ml-1 text-[11px] text-muted-foreground">{tareasPropuesta.filter((t) => !t.hecha).length}</span>}
              </TabsTrigger>
              <TabsTrigger value="actividad" className="flex-none">Actividad</TabsTrigger>
            </TabsList>
            <DetailBody>
              <TabsContent value="resumen">
                <DetailFields>
                  <DetailField key="estado" label="Estado">
                    <InlineField value={propuesta.estado} tipo="select" required opciones={ESTADOS_PROPUESTA.map((e) => ({ value: e.id, label: e.label }))} onSave={async (v) => onEstado(v as EstadoPropuesta)} render={() => <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>} />
                  </DetailField>
                  <DetailField key="marca" label="Marca">
                    <InlineField
                      value={marca.nombre}
                      readOnly
                      onSave={async () => undefined}
                      render={() => (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {marca.nombre}
                          <span className="rounded-md border px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                            {marca.atribucion === "red" ? "Marca de la red" : `Tuya hasta ${marca.atribucionHasta ? fmt.date(marca.atribucionHasta) : "dentro de 12 meses"}`}
                          </span>
                        </span>
                      )}
                    />
                  </DetailField>
                  <DetailField key="origen" label="Origen">
                    <InlineField value={propuesta.origen} tipo="select" required opciones={(Object.keys(ORIGENES) as OrigenPropuesta[]).map((o) => ({ value: o, label: ORIGENES[o] }))} onSave={guardar("origen")} render={(v) => ORIGENES[v as OrigenPropuesta]} />
                  </DetailField>
                  <DetailField key="piezas" label="Piden">
                    <InlineField value={describirPiezas(propuesta.piezas)} readOnly onSave={async () => undefined} />
                  </DetailField>
                  <DetailField key="ofrecen" label="Ofrecen" empty={propuesta.ofrecen === undefined}>
                    <InlineField
                      value={propuesta.ofrecen ?? null}
                      tipo="numero"
                      placeholder="Añadir importe"
                      onSave={async (v) => onChange({ ofrecen: v === null || v === "" ? undefined : Number(v) })}
                      render={(v) => (
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          {Number(v) === 0 ? "Regalo, sin fee" : fmt.eur(Number(v))}
                          {Number(v) > 0 && Number(v) < minimo && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                              <TriangleAlertIcon className="size-3.5" /> por debajo de tu mínimo
                            </span>
                          )}
                        </span>
                      )}
                    />
                  </DetailField>
                  <DetailField key="presupuesto" label="Tu presupuesto">
                    {calculo ? (
                      <InlineField
                        value={calculo.total}
                        readOnly
                        onSave={async () => undefined}
                        render={() => (
                          <span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums">
                            <span className="font-semibold">{fmt.eur(calculo.total)}</span>
                            <span className="text-xs text-muted-foreground">{propuesta.presupuesto?.conPrecios ? "media kit con precios" : "media kit sin precios"} · {fmt.date(propuesta.presupuesto?.generadoEl ?? hoy)}</span>
                            {calculo.bajoMinimo && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                                <TriangleAlertIcon className="size-3.5" /> bajo mínimo
                              </span>
                            )}
                          </span>
                        )}
                      />
                    ) : (
                      <Button variant="ghost" size="sm" className="-mx-1 h-7 px-1 text-brand" onClick={onPreparar}>
                        <FileTextIcon /> Preparar presupuesto y media kit
                      </Button>
                    )}
                  </DetailField>
                  <DetailField key="minimo" label="Tu mínimo">
                    <InlineField value={minimo} readOnly onSave={async () => undefined} render={() => <span className="tabular-nums text-muted-foreground">{fmt.eur(minimo)} por estas piezas</span>} />
                  </DetailField>
                  <DetailField key="desde" label="Publicar desde" empty={!propuesta.desde}>
                    <InlineField value={propuesta.desde ?? null} tipo="fecha" onSave={guardar("desde")} render={(v) => (v ? fmt.dateLong(String(v)) : "")} />
                  </DetailField>
                  <DetailField key="hasta" label="Publicar hasta" empty={!propuesta.hasta}>
                    <InlineField value={propuesta.hasta ?? null} tipo="fecha" onSave={guardar("hasta")} render={(v) => (v ? fmt.dateLong(String(v)) : "")} />
                  </DetailField>
                  <DetailField key="contacto" label="Último contacto">
                    <InlineField value={soloFecha(propuesta.ultimoContacto)} tipo="fecha" required onSave={guardar("ultimoContacto")} render={(v) => fmt.dateLong(String(v))} />
                  </DetailField>
                  <DetailField key="siguiente" label="Siguiente paso" empty={!propuesta.siguientePaso}>
                    <InlineField value={propuesta.siguientePaso ?? null} tipo="texto" placeholder="Qué toca hacer" onSave={guardar("siguientePaso")} />
                  </DetailField>
                  <DetailField key="siguienteFecha" label="Para cuándo" empty={!propuesta.siguienteFecha}>
                    <InlineField value={propuesta.siguienteFecha ?? null} tipo="fecha" onSave={guardar("siguienteFecha")} render={(v) => (v ? fmt.dateLong(String(v)) : "")} />
                  </DetailField>
                  {propuesta.estado === "perdida" && (
                    <DetailField key="motivo" label="Por qué se perdió" empty={!propuesta.motivoPerdida}>
                      <InlineField value={propuesta.motivoPerdida ?? null} tipo="select" opciones={(Object.keys(MOTIVOS_PERDIDA) as MotivoPerdida[]).map((m) => ({ value: m, label: MOTIVOS_PERDIDA[m] }))} onSave={guardar("motivoPerdida")} render={(v) => (v ? MOTIVOS_PERDIDA[v as MotivoPerdida] : "")} />
                    </DetailField>
                  )}
                  <DetailField key="notas" label="Notas" empty={!propuesta.notas}>
                    <InlineField value={propuesta.notas ?? null} tipo="textarea" multiline={3} placeholder="Lo que no quieres olvidar" onSave={guardar("notas")} />
                  </DetailField>
                </DetailFields>
                {marca.contactos.length > 0 && (
                  <DetailSection title="Contacto en la marca" icon={UserIcon} count={marca.contactos.length}>
                    <ul className="flex flex-col gap-2 text-sm">
                      {marca.contactos.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{c.nombre}</span>
                            {c.cargo && <span className="text-muted-foreground"> · {c.cargo}</span>}
                          </span>
                          {c.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await navigator.clipboard.writeText(c.email ?? "")
                                toast.success("Email copiado")
                              }}
                            >
                              <MailIcon /> {c.email}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </DetailSection>
                )}
                {marca.notas && (
                  <DetailSection title="Lo que sé de la marca" icon={MessageSquareIcon}>
                    <p className="text-sm text-muted-foreground">{marca.notas}</p>
                  </DetailSection>
                )}
                <DetailMeta>Creada el {fmt.dateLong(propuesta.creadaEl)}</DetailMeta>
              </TabsContent>
              <TabsContent value="tareas" className="py-2">
                <TaskTable
                  tareas={tareasPropuesta}
                  hoy={hoyFecha}
                  relacionFija={relacion}
                  onToggle={(id) => onTareas((ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)))}
                  onUpdate={(t) => onTareas((ts) => ts.map((x) => (x.id === t.id ? t : x)))}
                  onCreate={(t) => onTareas((ts) => [...ts, t])}
                  onDelete={(ids) => onTareas((ts) => ts.filter((t) => !ids.includes(t.id)))}
                />
              </TabsContent>
              <TabsContent value="actividad" className="p-4">
                <InteractionLog
                  entries={entradas}
                  autoEditId={editandoNota}
                  onSaveNote={async (entrada, note) => {
                    setApuntadas((as) => as.map((a) => (a.id === entrada.id ? { ...a, note } : a)))
                    setEditandoNota(null)
                  }}
                  onDelete={(entrada) => setApuntadas((as) => as.filter((a) => a.id !== entrada.id))}
                  actions={
                    <>
                      <Button variant="outline" size="sm" onClick={() => apuntarContacto("Hablé con la marca", MessageSquareIcon)}>
                        <MessageSquareIcon /> Contacto
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => apuntarContacto("Email enviado", MailIcon)}>
                        <MailIcon /> Email
                      </Button>
                    </>
                  }
                  empty="Todavía no hay nada apuntado: cada vez que hables con la marca, deja aquí una línea."
                />
              </TabsContent>
            </DetailBody>
          </Tabs>
          <DetailFooter>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            {propuesta.estado === "ganada" && propuesta.collabId ? (
              <Button asChild>
                <Link href={`/workspace/collabs/${propuesta.collabId}`}>
                  <SparklesIcon /> Ver la collab
                </Link>
              </Button>
            ) : propuesta.presupuesto ? (
              <Button asChild>
                <Link href={`/propuesta/${propuesta.id}`} target="_blank">
                  <ExternalLinkIcon /> Ver documento
                </Link>
              </Button>
            ) : (
              <Button onClick={onPreparar}>
                <FileTextIcon /> Preparar propuesta
              </Button>
            )}
          </DetailFooter>
        </>
      )}
    </DetailSheet>
  )
}
