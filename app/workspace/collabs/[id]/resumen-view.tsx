"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { BanknoteIcon, CheckIcon, ClapperboardIcon, CopyIcon, MailIcon, PackageIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_COBRO, ESTADOS_PIEZA, ESTADOS_PRODUCTO, FORMATOS, estadoDe, type Actividad, type Collab, type EstadoCobro, type Marca, type Tarea } from "@/lib/influencer/modelo"
import { describirEntregables, hitosDePieza, siguientePasoDePieza, tituloCorto } from "@/lib/influencer/collabs"
import { grupoDeTarea, ordenarTareas } from "@/lib/influencer/tareas"
import { diasEntre, soloFecha } from "@/lib/influencer/fechas"
import { tintClass } from "@/lib/influencer/tints"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/app/states"
import { SocialIcon } from "@/components/app/social-icons"
import { Block, BlockHeader } from "@/components/influencer/block"
import { TaskCard } from "@/components/influencer/task-card"

const MAX_TAREAS = 6

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((i) => (
        <span key={i} className="rounded-md bg-muted px-1.5 py-px text-xs font-medium">
          {i}
        </span>
      ))}
    </span>
  )
}

/** La portada de la collab: lo que hay que cumplir arriba, la operativa debajo. */
export function ResumenView({ hoy, collab, marca, tareas: iniciales, actividad, materiales }: { hoy: string; collab: Collab; marca: Marca; tareas: Tarea[]; actividad: Actividad[]; materiales: number }) {
  const hoyFecha = soloFecha(hoy)
  const [tareas, setTareas] = React.useState(iniciales)
  const [cobro, setCobro] = React.useState(collab.cobro)
  const base = `/workspace/collabs/${collab.id}`
  const { brief } = collab
  const pendientes = ordenarTareas(tareas.filter((t) => !t.hecha))
  const estadoCobro = estadoDe(ESTADOS_COBRO, cobro.estado)

  const hitos = collab.piezas
    .flatMap((p) => hitosDePieza(p).map((h) => ({ ...h, pieza: p })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const siguienteCobro: Partial<Record<EstadoCobro, { label: string; icon: typeof BanknoteIcon; siguiente?: EstadoCobro; aviso: string }>> = {
    "por-facturar": { label: "Datos para la factura", icon: CopyIcon, aviso: "Concepto, base, IVA, retención y datos fiscales copiados" },
    facturado: { label: "Marcar como cobrado", icon: CheckIcon, siguiente: "cobrado", aviso: "Cobro apuntado" },
    vencido: { label: "Reclamar el cobro", icon: MailIcon, aviso: "Recordatorio preparado para enviar" },
  }
  const accionCobro = siguienteCobro[cobro.estado]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_372px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Block className="overflow-hidden p-0">
          {collab.coverUrl && (
            <div className="relative h-36">
              <Image src={collab.coverUrl} alt="" fill sizes="(min-width: 1280px) 800px, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute right-5 bottom-3 left-5 text-sm font-medium text-white">{describirEntregables(collab)} · publicación del {fmt.date(collab.desde)} al {fmt.date(collab.hasta)}</p>
            </div>
          )}
          <div className="p-5">
            <BlockHeader title="Brief" href={`${base}/brief`} hrefLabel="Ver brief completo" />
            <p className="text-sm leading-relaxed">{brief.objetivo || "Sin objetivo todavía: rellénalo en el brief."}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Dato label="Entregables">{describirEntregables(collab)}</Dato>
              <Dato label="Menciones y hashtags">{brief.menciones.length + brief.hashtags.length ? <Chips items={[...brief.menciones, ...brief.hashtags]} /> : "—"}</Dato>
              <Dato label="Enlace y código">
                {brief.enlace ? (
                  <a href={brief.enlace} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {brief.enlace.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
                {brief.codigo && <span className="ml-1.5 rounded-md border px-1.5 py-px font-mono text-xs">{brief.codigo}</span>}
              </Dato>
              <Dato label="Exclusividad y derechos">
                {[brief.exclusividad, brief.derechosUso].filter(Boolean).join(" · ") || "Sin exclusividad, solo orgánico"}
              </Dato>
              <Dato label="Rondas de cambios">{brief.rondasIncluidas} incluidas por pieza</Dato>
              <Dato label="Producto">
                {brief.producto ? (
                  <span className="inline-flex items-center gap-1.5">
                    <PackageIcon className="size-3.5 text-muted-foreground" />
                    {estadoDe(ESTADOS_PRODUCTO, brief.producto.estado).label}
                    {brief.producto.detalle && <span className="text-muted-foreground">· {brief.producto.detalle}</span>}
                  </span>
                ) : (
                  "No hay envío"
                )}
              </Dato>
            </dl>
          </div>
        </Block>

        <Block>
          <BlockHeader title="Entregables" count={collab.piezas.length} href={`${base}/contenidos`} hrefLabel="Ver contenidos" />
          {collab.piezas.length === 0 ? (
            <EmptyState icon={ClapperboardIcon} title="Sin piezas" description="Añade las piezas del brief en Contenidos." />
          ) : (
            <ul className="flex flex-col gap-2">
              {collab.piezas.map((p) => {
                const e = estadoDe(ESTADOS_PIEZA, p.estado)
                const red = FORMATOS[p.formato].red
                return (
                  <li key={p.id}>
                    <Link href={`${base}/contenidos/${p.id}`} className="flex items-center gap-3 rounded-xl bg-background/70 p-2.5 transition-colors hover:bg-muted">
                      <span className={cn("relative size-12 flex-none overflow-hidden rounded-lg", tintClass[collab.tint])}>
                        {p.portadaUrl ? <Image src={p.portadaUrl} alt="" fill sizes="48px" className="object-cover" /> : <ClapperboardIcon className="absolute inset-0 m-auto size-5" />}
                      </span>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{p.titulo}</span>
                          <StatusBadge tone={e.tone}>{e.label}</StatusBadge>
                        </span>
                        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          {red && <SocialIcon network={red} className="size-3" />}
                          {siguientePasoDePieza(p)}
                        </span>
                      </span>
                      <span className="hidden flex-none text-right text-xs text-muted-foreground sm:block">
                        Publicar
                        <br />
                        <span className={cn("font-medium", diasEntre(hoyFecha, p.publicacion) < 0 && !p.publicada ? "text-danger" : "text-foreground")}>{fmt.date(p.publicacion)}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Block>

        <Block>
          <BlockHeader title="Cronograma" count={hitos.filter((h) => !h.hecho).length} />
          <ol className="flex flex-col">
            {hitos.map((h, i) => {
              const dias = diasEntre(hoyFecha, h.fecha)
              const vencido = !h.hecho && dias < 0
              const esHoy = dias === 0
              return (
                <li key={`${h.pieza.id}-${h.tipo}`} className={cn("relative flex items-center gap-3 py-2 pl-1", i < hitos.length - 1 && "border-b border-border/60")}>
                  <span className={cn("w-16 flex-none text-xs tabular-nums", esHoy ? "font-semibold text-brand" : vencido ? "text-danger" : "text-muted-foreground")}>{esHoy ? "Hoy" : fmt.date(h.fecha)}</span>
                  <span className={cn("grid size-4 flex-none place-items-center rounded-full border-[1.5px]", h.hecho ? "border-success bg-success text-background" : vencido ? "border-danger" : esHoy ? "border-brand" : "border-control")}>{h.hecho && <CheckIcon className="size-2.5" strokeWidth={3} />}</span>
                  <span className={cn("min-w-0 flex-1 truncate text-sm", h.hecho && "text-muted-foreground line-through")}>
                    {h.verbo} <span className="text-muted-foreground">· {tituloCorto(h.pieza)}</span>
                  </span>
                  {vencido && <span className="text-xs font-medium text-danger">{Math.abs(dias)} {Math.abs(dias) === 1 ? "día" : "días"} tarde</span>}
                </li>
              )
            })}
          </ol>
        </Block>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Block>
          <BlockHeader title="Tareas" count={pendientes.length} href={`${base}/tareas`} hrefLabel="Ver todas" />
          {pendientes.length === 0 ? (
            <EmptyState title="Nada pendiente" description="Añade tareas desde «Nueva tarea» o deja que salgan de las fechas del brief." />
          ) : (
            <ul className="flex flex-col gap-2">
              {pendientes.slice(0, MAX_TAREAS).map((t) => {
                const g = grupoDeTarea(t, hoyFecha)
                return (
                  <li key={t.id}>
                    <TaskCard title={t.titulo} dueAt={t.fechaLimite ?? hoyFecha} tone={g === "vencidas" ? "vencida" : g === "hoy" ? "hoy" : "normal"} done={t.hecha} onToggle={() => setTareas((ts) => ts.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha } : x)))} />
                  </li>
                )
              })}
            </ul>
          )}
        </Block>

        <Block>
          <BlockHeader title="Cobro" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato label="Importe">
              <span className="font-semibold tabular-nums">{fmt.eur(collab.importeNeto ?? collab.importe)}</span>
              {collab.importeNeto && <span className="text-xs text-muted-foreground"> de {fmt.eur(collab.importe)}</span>}
            </Dato>
            <Dato label="Estado">
              <StatusBadge tone={estadoCobro.tone} dot>
                {estadoCobro.label}
              </StatusBadge>
            </Dato>
            <Dato label="Factura">{cobro.factura ?? "Sin emitir"}</Dato>
            <Dato label="Vencimiento">{cobro.vencimiento ? fmt.date(cobro.vencimiento) : brief.condicionesPago || "—"}</Dato>
          </dl>
          {accionCobro && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-fit"
              onClick={() => {
                if (accionCobro.siguiente) setCobro((c) => ({ ...c, estado: accionCobro.siguiente ?? c.estado }))
                toast.success(accionCobro.aviso)
              }}
            >
              <accionCobro.icon /> {accionCobro.label}
            </Button>
          )}
        </Block>

        <Block>
          <BlockHeader title="Contacto y materiales" href={`${base}/materiales`} hrefLabel={`${materiales} archivos`} />
          <p className="text-sm">
            <span className="font-medium">{brief.contacto.nombre || marca.contactos[0]?.nombre || "Sin contacto"}</span>
            {brief.contacto.email && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-6 px-1.5"
                onClick={async () => {
                  await navigator.clipboard.writeText(brief.contacto.email)
                  toast.success("Email copiado")
                }}
              >
                <MailIcon /> {brief.contacto.email}
              </Button>
            )}
          </p>
          {marca.notas && <p className="mt-2 text-xs text-muted-foreground">{marca.notas}</p>}
        </Block>

        <Block>
          <BlockHeader title="Actividad" />
          {actividad.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no ha pasado nada.</p>
          ) : (
            <ol className="relative flex flex-col gap-3 border-l pl-4 text-sm">
              {actividad.slice(0, 5).map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-border ring-2 ring-card" />
                  <p>
                    <span className="font-semibold">{a.quien}</span> {a.que}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmt.relative(a.el, new Date(hoy))}</p>
                </li>
              ))}
            </ol>
          )}
        </Block>
      </div>
    </div>
  )
}
