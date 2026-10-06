"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDownIcon, DownloadIcon, EyeIcon, FileTextIcon, GripVerticalIcon, LayersIcon, LinkIcon, PlusIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { BLOQUES_MEDIA_KIT, describirPiezas, type BloqueMediaKit, type MediaKit } from "@/lib/influencer/modelo"
import { bloquesVisibles, hojasDelMediaKit, moverBloque } from "@/lib/influencer/media-kit"
import { importeDe } from "@/lib/influencer/crm"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { PageBody } from "@/components/app/page-header"
import { Section, SectionBody, SectionFooter, SectionHeader } from "@/components/app/section"
import { InsightList } from "@/components/app/insights-panel"
import { MediaKitHojas } from "@/components/influencer/media-kit-doc"
import { useOrigen } from "@/components/influencer/navegador"
import { useCrm } from "../crm-provider"
import { CrmHeader } from "../crm-header"
import { PrepararPropuestaDialog } from "../preparar-propuesta-dialog"

/** Bloques con algo que escribir dentro: el resto sale solo de tu perfil y tus collabs. */
const EDITABLES: BloqueMediaKit[] = ["portada"]

/**
 * El media kit: a la izquierda sus bloques (arrastrar para ordenar, interruptor para enseñar o
 * esconder, textos de la portada) y a la derecha cómo queda en A4. Lo usan todas las propuestas.
 */
export function MediaKitView() {
  const router = useRouter()
  const origen = useOrigen()
  const { perfil, mediaKit, setMediaKit, marcasTrabajadas, propuestas, marcas, hoy } = useCrm()
  const [abierto, setAbierto] = React.useState<BloqueMediaKit | null>(null)
  const [nueva, setNueva] = React.useState(false)
  // Id fijo para que el servidor y el navegador pinten los mismos atributos de arrastre.
  const dndId = React.useId()
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const cambiar = (cambios: Partial<MediaKit>) => setMediaKit({ ...mediaKit, ...cambios, actualizadoEl: hoy })
  const alSoltar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    setMediaKit({ ...moverBloque(mediaKit, e.active.id as BloqueMediaKit, e.over.id as BloqueMediaKit), actualizadoEl: hoy })
  }
  const alternar = (id: BloqueMediaKit, visible: boolean) => cambiar({ bloques: mediaKit.bloques.map((b) => (b.id === id ? { ...b, visible } : b)) })

  const bloques = bloquesVisibles(mediaKit)
  const hojas = hojasDelMediaKit(bloques).length
  const enviadas = propuestas.filter((p) => p.presupuesto).sort((a, b) => (b.presupuesto?.generadoEl ?? "").localeCompare(a.presupuesto?.generadoEl ?? "")).slice(0, 5)

  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
      <CrmHeader
        description="Tu media kit: ordena los bloques arrastrando, escóndelos o cambia los textos. Va en todas tus propuestas."
        actions={
          <>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(`${origen}/media-kit`)
                toast.success("Enlace al media kit copiado")
              }}
            >
              {/* En el móvil, solo el icono: las tres acciones caben en una línea. */}
              <LinkIcon /> <span className="max-sm:sr-only">Copiar enlace</span>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/media-kit" target="_blank"><DownloadIcon /> <span className="max-sm:sr-only">Descargar PDF</span></Link>
            </Button>
            <Button onClick={() => setNueva(true)}><PlusIcon /> Nueva propuesta</Button>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 items-start gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Section className="flex-none">
            <SectionHeader icon={LayersIcon} title="Bloques" count={bloques.length} meta={`${hojas} ${hojas === 1 ? "hoja" : "hojas"} A4`} />
            <SectionBody className="p-2">
              <DndContext id={dndId} sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
                <SortableContext items={mediaKit.bloques.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {mediaKit.bloques.map((b) => (
                    <FilaBloque key={b.id} id={b.id} visible={b.visible} abierto={abierto === b.id} onAbrir={() => setAbierto(abierto === b.id ? null : b.id)} onVisible={(v) => alternar(b.id, v)}>
                      {b.id === "portada" && (
                        <div className="grid gap-3">
                          <Field>
                            <FieldLabel htmlFor="mk-titular">Titular</FieldLabel>
                            <Textarea id="mk-titular" rows={2} value={mediaKit.titular} onChange={(e) => cambiar({ titular: e.target.value })} />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="mk-bio">Bio</FieldLabel>
                            <Textarea id="mk-bio" rows={4} value={mediaKit.bio} onChange={(e) => cambiar({ bio: e.target.value })} />
                          </Field>
                        </div>
                      )}
                    </FilaBloque>
                  ))}
                </SortableContext>
              </DndContext>
            </SectionBody>
            <SectionFooter>
              <span>Cifras, redes, audiencia y tarifas salen de tu perfil; las marcas, de tus collabs.</span>
            </SectionFooter>
          </Section>

          <Section className="flex-none">
            <SectionHeader icon={FileTextIcon} title="Últimas propuestas" count={enviadas.length} />
            <SectionBody className="px-4 py-3">
              {enviadas.length ? (
                <InsightList
                  items={enviadas.map((p) => ({
                    key: p.id,
                    title: <Link href={`/propuesta/${p.id}`} target="_blank" className="hover:underline">{marcas.find((m) => m.id === p.marcaId)?.nombre ?? "—"}</Link>,
                    subtitle: `${p.campana} · ${describirPiezas(p.presupuesto?.lineas ?? p.piezas)}`,
                    trailing: <span className="tabular-nums">{fmt.eur(importeDe(p, perfil.tarifas))}</span>,
                  }))}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Cuando prepares una propuesta, aquí tendrás su documento a mano.</p>
              )}
            </SectionBody>
          </Section>
        </div>

        <Section className="xl:sticky xl:top-4">
          <SectionHeader icon={EyeIcon} title="Vista previa" meta={`Actualizado el ${fmt.date(mediaKit.actualizadoEl)}`} />
          <SectionBody className="theme-light overflow-x-auto bg-muted p-4">
            {/* La hoja A4 mide 794 px: se enseña reducida para que quepa junto a los bloques. */}
            <div className="mx-auto flex w-fit flex-col items-center gap-4 [zoom:0.42] sm:[zoom:0.6] 2xl:[zoom:0.72]">
              <MediaKitHojas perfil={perfil} kit={mediaKit} bloques={bloques} marcasTrabajadas={marcasTrabajadas} pie={`${perfil.nombre} · Media kit`} />
            </div>
          </SectionBody>
        </Section>
      </div>

      <PrepararPropuestaDialog open={nueva} onOpenChange={setNueva} onVerEnPipeline={(id) => router.push(`/workspace/crm?registro=${id}`)} />
    </PageBody>
  )
}

function FilaBloque({ id, visible, abierto, onAbrir, onVisible, children }: { id: BloqueMediaKit; visible: boolean; abierto: boolean; onAbrir: () => void; onVisible: (v: boolean) => void; children?: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const editable = EDITABLES.includes(id)
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("rounded-lg", isDragging && "relative z-10 bg-card shadow-pop", abierto && "bg-muted/50")}>
      <div className="flex items-center gap-2 px-1 py-1.5">
        <button type="button" aria-label={`Mover ${BLOQUES_MEDIA_KIT[id].label}`} className="grid size-7 flex-none cursor-grab place-items-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVerticalIcon className="size-4" />
        </button>
        <button type="button" disabled={!editable} onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-1 text-left disabled:cursor-default">
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-sm font-medium", !visible && "text-muted-foreground line-through")}>{BLOQUES_MEDIA_KIT[id].label}</span>
            <span className="block truncate text-xs text-muted-foreground">{BLOQUES_MEDIA_KIT[id].descripcion}</span>
          </span>
          {editable && <ChevronDownIcon className={cn("size-4 flex-none text-muted-foreground transition-transform", abierto && "rotate-180")} />}
        </button>
        <Switch checked={visible} onCheckedChange={onVisible} aria-label={`Enseñar ${BLOQUES_MEDIA_KIT[id].label}`} />
      </div>
      {abierto && children && <div className="px-3 pt-1 pb-3">{children}</div>}
    </div>
  )
}
