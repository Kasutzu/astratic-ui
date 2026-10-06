"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRightIcon, CopyIcon, EllipsisIcon, ExternalLinkIcon, FileTextIcon, MailIcon, SparklesIcon, ThumbsDownIcon, Trash2Icon, TriangleAlertIcon, TrophyIcon, UndoIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { ESTADOS_PROPUESTA, MOTIVOS_PERDIDA, ORIGENES, describirPiezas, estadoDe, type EstadoPropuesta, type MotivoPerdida, type OrigenPropuesta, type Propuesta, type UsoPlantilla } from "@/lib/influencer/modelo"
import { calcularPresupuesto, minimoDe } from "@/lib/influencer/presupuesto"
import { bajoMinimo, contactoDePropuesta, esAbierta, importeDe, siguienteEstado, textoAtribucion } from "@/lib/influencer/crm"
import { tareasDe } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/app/status-badge"
import { DetailBody, DetailField, DetailFields, DetailFooter, DetailHeader, DetailMeta, DetailSection, DetailSheet, DetailSummary, RecordPager } from "@/components/app/detail-sheet"
import { InlineField, InlineTitle, type ValorInline } from "@/components/app/inline-field"
import { BrandMark } from "@/components/influencer/brand-mark"
import { TaskTable } from "@/components/influencer/task-table"
import { useCrm } from "./crm-provider"
import { Seguimiento } from "./seguimiento"
import type { AccionesPropuesta } from "./use-propuesta-acciones"

/** La plantilla que toca según cómo va la propuesta. */
const USO_POR_ESTADO: Record<EstadoPropuesta, UsoPlantilla> = {
  nueva: "tarifas",
  hablando: "tarifas",
  enviada: "seguimiento",
  negociando: "negociacion",
  ganada: "cierre",
  perdida: "seguimiento",
}

/** La ficha de una propuesta: lo que se mira siempre arriba, y debajo el seguimiento, los datos y las tareas. */
export function PropuestaSheet({ lista, acciones }: { lista: Propuesta[]; acciones: AccionesPropuesta }) {
  const { marcas, contactos, perfil, tareas, setTareas, hoy, actualizarPropuesta } = useCrm()
  const p = acciones.abierta
  const marca = p ? (marcas.find((m) => m.id === p.marcaId) ?? null) : null
  const posicion = p ? lista.findIndex((x) => x.id === p.id) : -1
  const tarifas = perfil.tarifas

  const guardar = (campo: keyof Propuesta) => async (v: ValorInline) => {
    if (p) actualizarPropuesta(p.id, { [campo]: v === "" || v === null ? undefined : v })
  }

  return (
    <DetailSheet open={p !== null && marca !== null} onOpenChange={(o) => !o && acciones.abrir(null)}>
      {p && marca && <React.Fragment key={p.id}>{pintarFicha()}</React.Fragment>}
    </DetailSheet>
  )

  // Una función que devuelve JSX, no un componente: así no se vuelve a montar en cada pintado.
  function pintarFicha() {
    if (!p || !marca) return null
    const estado = estadoDe(ESTADOS_PROPUESTA, p.estado)
    const contacto = contactoDePropuesta(p, contactos)
    const deLaMarca = contactos.filter((c) => c.marcaId === marca.id)
    const calculo = p.presupuesto ? calcularPresupuesto(p.presupuesto, tarifas) : null
    const minimo = minimoDe(p.piezas, tarifas)
    const siguiente = siguienteEstado(p.estado)
    const relacion = { tipo: "propuesta" as const, id: p.id, label: `${marca.nombre} · ${p.campana}` }
    const tareasPropuesta = tareasDe(tareas, relacion)
    const pendientes = tareasPropuesta.filter((t) => !t.hecha).length

    return (
      <>
        <DetailHeader
          leading={<BrandMark name={marca.nombre} tint={marca.tint} size="lg" />}
          title={<InlineTitle parts={[{ key: "campana", value: p.campana, placeholder: "Campaña", required: true }]} onSave={async (v) => actualizarPropuesta(p.id, { campana: v.campana ?? p.campana })} />}
          subtitle={
            <>
              <Link href={`/workspace/crm/marcas?registro=${marca.id}`} className="hover:underline">{marca.nombre}</Link>
              {contacto && (
                <>
                  {" · "}
                  <Link href={`/workspace/crm/contactos?registro=${contacto.id}`} className="hover:underline">{contacto.nombre}</Link>
                </>
              )}
            </>
          }
          status={<StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>}
          nav={<RecordPager index={posicion} total={lista.length} label="propuesta" onPrev={() => acciones.abrir(lista[posicion - 1].id)} onNext={() => acciones.abrir(lista[posicion + 1].id)} />}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => acciones.escribir(p, USO_POR_ESTADO[p.estado])}><MailIcon /> Escribir</Button>
              <Button variant="outline" size="sm" onClick={() => acciones.preparar(p)}><FileTextIcon /> {p.presupuesto ? "Rehacer propuesta" : "Preparar propuesta"}</Button>
              {p.presupuesto && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/propuesta/${p.id}`} target="_blank"><ExternalLinkIcon /> Documento</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Más acciones" className="ml-auto"><EllipsisIcon /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {esAbierta(p) ? (
                    <>
                      <DropdownMenuItem onSelect={() => acciones.cambiarEstado([p.id], "ganada")}><TrophyIcon /> Marcar como ganada</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => acciones.perder([p.id])}><ThumbsDownIcon /> Marcar como perdida</DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onSelect={() => acciones.cambiarEstado([p.id], "negociando")}><UndoIcon /> Reabrir</DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/workspace/crm?registro=${p.id}`)
                      toast.success("Enlace copiado")
                    }}
                  >
                    <CopyIcon /> Copiar enlace
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => acciones.borrar(p)}><Trash2Icon /> Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <DetailSummary>
          {p.estado === "perdida" && p.motivoPerdida && (
            <div className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger"><span className="font-medium">Se perdió por:</span> {MOTIVOS_PERDIDA[p.motivoPerdida]}</div>
          )}
          <DetailFields columns={2}>
            <DetailField label="Estado">
              <InlineField value={p.estado} tipo="select" required opciones={ESTADOS_PROPUESTA.map((e) => ({ value: e.id, label: e.label }))} onSave={async (v) => acciones.cambiarEstado([p.id], v as EstadoPropuesta)} render={() => <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>} />
            </DetailField>
            <DetailField label="Importe">
              <InlineField
                value={importeDe(p, tarifas)}
                readOnly
                onSave={async () => undefined}
                render={(v) => (
                  <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                    {Number(v) > 0 ? fmt.eur(Number(v)) : p.ofrecen === 0 ? "Regalo" : "Sin importe"}
                    {bajoMinimo(p, tarifas) && <TriangleAlertIcon className="size-3.5 text-warning" aria-label="Por debajo de tu mínimo" />}
                  </span>
                )}
              />
            </DetailField>
            <DetailField label="Contacto" empty={!contacto && deLaMarca.length > 0}>
              {deLaMarca.length === 0 ? (
                <Link href={`/workspace/crm/marcas?registro=${marca.id}`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Añadir en la marca</Link>
              ) : (
                <InlineField value={contacto?.id ?? null} tipo="select" opciones={deLaMarca.map((c) => ({ value: c.id, label: c.nombre }))} placeholder="Elegir persona" onSave={guardar("contactoId")} />
              )}
            </DetailField>
            <DetailField label="Contactado">
              <InlineField value={soloFecha(p.ultimoContacto)} tipo="fecha" onSave={async (v) => actualizarPropuesta(p.id, { ultimoContacto: v ? String(v) : p.ultimoContacto })} render={(v) => fmt.date(String(v))} />
            </DetailField>
            <DetailField label="Siguiente paso" empty={!p.siguientePaso}>
              <InlineField value={p.siguientePaso ?? null} placeholder="Qué toca hacer" onSave={guardar("siguientePaso")} />
            </DetailField>
            <DetailField label="Para cuándo" empty={!p.siguienteFecha}>
              <InlineField value={p.siguienteFecha ?? null} tipo="fecha" placeholder="Añadir fecha" onSave={guardar("siguienteFecha")} render={(v) => (v ? fmt.date(String(v)) : "")} />
            </DetailField>
          </DetailFields>
        </DetailSummary>

        <Tabs defaultValue="seguimiento" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="seguimiento" className="flex-none">Seguimiento</TabsTrigger>
            <TabsTrigger value="datos" className="flex-none">Datos</TabsTrigger>
            <TabsTrigger value="tareas" className="flex-none">Tareas{pendientes ? ` · ${pendientes}` : ""}</TabsTrigger>
          </TabsList>
          <DetailBody>
            <TabsContent value="seguimiento" className="px-4 py-3">
              <Seguimiento filtro={(i) => i.propuestaId === p.id} nueva={{ marcaId: marca.id, contactoId: contacto?.id, propuestaId: p.id }} />
            </TabsContent>
            <TabsContent value="datos">
              <div className="px-4 py-3">
                <DetailFields>
                  <DetailField key="piezas" label="Piden">
                    <InlineField value={describirPiezas(p.piezas)} readOnly onSave={async () => undefined} />
                  </DetailField>
                  <DetailField key="ofrecen" label="Ofrecen" empty={p.ofrecen === undefined}>
                    <InlineField value={p.ofrecen ?? null} tipo="numero" placeholder="Añadir importe" onSave={async (v) => actualizarPropuesta(p.id, { ofrecen: v === null || v === "" ? undefined : Number(v) })} render={(v) => <span className="tabular-nums">{Number(v) === 0 ? "Regalo, sin fee" : fmt.eur(Number(v))}</span>} />
                  </DetailField>
                  <DetailField key="presupuesto" label="Tu presupuesto">
                    {calculo && p.presupuesto ? (
                      <InlineField
                        value={calculo.total}
                        readOnly
                        onSave={async () => undefined}
                        render={() => (
                          <span className="tabular-nums">
                            <span className="font-semibold">{fmt.eur(calculo.total)}</span> <span className="text-xs text-muted-foreground">· {p.presupuesto?.rondas} rondas · vale {p.presupuesto?.validez} días · {p.presupuesto?.conPrecios ? "con precios" : "sin precios"}</span>
                          </span>
                        )}
                      />
                    ) : (
                      <Button variant="ghost" size="sm" className="-mx-1 h-7 px-1 text-brand" onClick={() => acciones.preparar(p)}><FileTextIcon /> Preparar presupuesto</Button>
                    )}
                  </DetailField>
                  <DetailField key="minimo" label="Tu mínimo">
                    <InlineField value={minimo} readOnly onSave={async () => undefined} render={() => <span className="tabular-nums text-muted-foreground">{fmt.eur(minimo)} por estas piezas</span>} />
                  </DetailField>
                  <DetailField key="origen" label="Origen">
                    <InlineField value={p.origen} tipo="select" required opciones={(Object.keys(ORIGENES) as OrigenPropuesta[]).map((o) => ({ value: o, label: ORIGENES[o] }))} onSave={guardar("origen")} render={(v) => ORIGENES[v as OrigenPropuesta]} />
                  </DetailField>
                  <DetailField key="atribucion" label="Marca">
                    <InlineField value={textoAtribucion(marca)} readOnly onSave={async () => undefined} />
                  </DetailField>
                  <DetailField key="desde" label="Publicar desde" empty={!p.desde}>
                    <InlineField value={p.desde ?? null} tipo="fecha" onSave={guardar("desde")} render={(v) => (v ? fmt.dateLong(String(v)) : "")} />
                  </DetailField>
                  <DetailField key="hasta" label="Publicar hasta" empty={!p.hasta}>
                    <InlineField value={p.hasta ?? null} tipo="fecha" onSave={guardar("hasta")} render={(v) => (v ? fmt.dateLong(String(v)) : "")} />
                  </DetailField>
                  {p.estado === "perdida" && (
                    <DetailField key="motivo" label="Por qué se perdió" empty={!p.motivoPerdida}>
                      <InlineField value={p.motivoPerdida ?? null} tipo="select" opciones={(Object.keys(MOTIVOS_PERDIDA) as MotivoPerdida[]).map((m) => ({ value: m, label: MOTIVOS_PERDIDA[m] }))} onSave={guardar("motivoPerdida")} render={(v) => (v ? MOTIVOS_PERDIDA[v as MotivoPerdida] : "")} />
                    </DetailField>
                  )}
                  <DetailField key="notas" label="Notas" empty={!p.notas}>
                    <InlineField value={p.notas ?? null} tipo="textarea" multiline={3} placeholder="Lo que no quieres olvidar" onSave={guardar("notas")} />
                  </DetailField>
                </DetailFields>
              </div>
              {marca.notas && (
                <DetailSection title="Lo que sabes de la marca">
                  <p className="text-sm text-muted-foreground">{marca.notas}</p>
                </DetailSection>
              )}
              <DetailMeta>Creada el {fmt.dateLong(p.creadaEl)}</DetailMeta>
            </TabsContent>
            <TabsContent value="tareas" className="py-2">
              <TaskTable
                tareas={tareasPropuesta}
                hoy={soloFecha(hoy)}
                relacionFija={relacion}
                onToggle={(id) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)))}
                onUpdate={(t) => setTareas((ts) => ts.map((x) => (x.id === t.id ? t : x)))}
                onCreate={(t) => setTareas((ts) => [...ts, t])}
                onDelete={(ids) => setTareas((ts) => ts.filter((t) => !ids.includes(t.id)))}
              />
            </TabsContent>
          </DetailBody>
        </Tabs>

        <DetailFooter>
          <Button variant="ghost" onClick={() => acciones.abrir(null)}>Cerrar</Button>
          {p.estado === "ganada" ? (
            p.collabId ? (
              <Button asChild><Link href={`/workspace/collabs/${p.collabId}`}><SparklesIcon /> Ver la collab</Link></Button>
            ) : (
              <Button asChild><Link href="/workspace/collabs?nueva=1"><SparklesIcon /> Crear la collab</Link></Button>
            )
          ) : p.estado === "perdida" ? (
            <Button variant="outline" onClick={() => acciones.cambiarEstado([p.id], "negociando")}><UndoIcon /> Reabrir</Button>
          ) : siguiente === "ganada" ? (
            <Button onClick={() => acciones.cambiarEstado([p.id], "ganada")}><TrophyIcon /> Marcar ganada</Button>
          ) : siguiente ? (
            <Button onClick={() => acciones.cambiarEstado([p.id], siguiente)}><ArrowRightIcon /> Pasar a {estadoDe(ESTADOS_PROPUESTA, siguiente).label}</Button>
          ) : null}
        </DetailFooter>
      </>
    )
  }
}
