"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BanknoteIcon,
  BellRingIcon,
  CircleCheckIcon,
  FileTextIcon,
  KanbanSquareIcon,
  MessageSquareWarningIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { fmt } from "@/lib/format"
import type { Aviso, Collab, Enlace, Marca, Perfil, Propuesta, Tarea, TipoAviso } from "@/lib/influencer/modelo"
import { describirEntregables, marcaDe, siguienteHito, unidadesHechas, unidadesTotales } from "@/lib/influencer/collabs"
import { contextoDeTarea, grupoDeTarea, type GrupoTarea } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageBody } from "@/components/app/page-header"
import { EmptyState } from "@/components/app/states"
import { Block, BlockHeader } from "@/components/influencer/block"
import { StatRow, StatTile } from "@/components/influencer/stat-tile"
import { CollabCard, CollabCardRow } from "@/components/influencer/collab-card"
import { TaskCard } from "@/components/influencer/task-card"
import { ProfilePanel } from "@/components/influencer/profile-panel"
import { NoticeHighlight, NoticeItem } from "@/components/influencer/notice-card"
import { LinkGrid } from "@/components/influencer/link-grid"
import { TaskDialog } from "@/components/influencer/task-dialog"

const iconoAviso: Record<TipoAviso, LucideIcon> = {
  oportunidad: SparklesIcon,
  cambios: MessageSquareWarningIcon,
  aprobado: CircleCheckIcon,
  cobro: BanknoteIcon,
  astratic: BellRingIcon,
}

type Pestana = Extract<GrupoTarea, "hoy" | "semana" | "vencidas">

const pestanas: { id: Pestana; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "vencidas", label: "Vencidas" },
]

export function InicioView({
  greeting,
  now,
  perfil,
  cifras,
  collabs,
  marcas,
  propuestas,
  tareas: tareasIniciales,
  destacado,
  avisos,
  enlaces: enlacesIniciales,
}: {
  greeting: string
  now: string
  perfil: Perfil
  cifras: { pendienteDeCobro: number; cobradoEsteAno: number; collabsEnCurso: number; propuestasAbiertas: number }
  collabs: Collab[]
  marcas: Marca[]
  propuestas: Propuesta[]
  tareas: Tarea[]
  destacado: Aviso
  avisos: Aviso[]
  enlaces: Enlace[]
}) {
  const router = useRouter()
  const [tareas, setTareas] = React.useState(tareasIniciales)
  const [pestana, setPestana] = React.useState<Pestana>("hoy")
  const [enlaces, setEnlaces] = React.useState(enlacesIniciales)
  const [editandoEnlaces, setEditandoEnlaces] = React.useState(false)
  const [nuevaTarea, setNuevaTarea] = React.useState(false)
  const ahora = new Date(now)
  const hoyFecha = soloFecha(now)
  const contexto = { collabs, propuestas, marcas }

  const pendientes = (g: GrupoTarea) => tareas.filter((t) => grupoDeTarea(t, hoyFecha) === g).length
  const visibles = tareas.filter((t) => grupoDeTarea(t, hoyFecha) === pestana || (t.hecha && t.fechaLimite === hoyFecha && pestana === "hoy"))
  const vencidas = pendientes("vencidas")
  const deHoy = pendientes("hoy")

  const marcarTarea = (id: string) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)))

  const urgente =
    vencidas > 0 || deHoy > 0
      ? [vencidas > 0 && `${vencidas} ${vencidas === 1 ? "tarea vencida" : "tareas vencidas"}`, deHoy > 0 && `${deHoy} para hoy`].filter(Boolean).join(" y ")
      : "nada urgente"

  return (
    <PageBody className="gap-6 px-4 pb-28 md:px-[34px] md:pb-10">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{fmt.dateLong(ahora)}</p>
          <h1 className="mt-1 text-[27px] leading-tight font-semibold tracking-tight">
            {greeting}, {perfil.nombrePila}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tienes{" "}
            <button type="button" onClick={() => setPestana(vencidas > 0 ? "vencidas" : "hoy")} className="font-medium text-foreground underline-offset-2 hover:underline">
              {urgente}
            </button>
            .
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="mt-5 flex-none">
              <PlusIcon /> Nuevo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => router.push("/workspace/propuestas?nueva=1")}>Propuesta</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/workspace/collabs?nueva=1")}>Collab</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setNuevaTarea(true)}>Tarea</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditandoEnlaces(true)}>Enlace</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_372px]">
        <div className="flex min-w-0 flex-col gap-6">
          <StatRow>
            <StatTile icon={WalletIcon} label="Pendiente de cobro" value={fmt.eur(cifras.pendienteDeCobro)} tint="peach" href="/workspace/cobros" />
            <StatTile icon={BanknoteIcon} label="Cobrado este año" value={fmt.eur(cifras.cobradoEsteAno)} tint="mint" href="/workspace/cobros" />
            <StatTile icon={SparklesIcon} label="Collabs en curso" value={cifras.collabsEnCurso} tint="rose" href="/workspace/collabs" />
            <StatTile icon={KanbanSquareIcon} label="Propuestas abiertas" value={cifras.propuestasAbiertas} tint="sky" href="/workspace/propuestas" />
          </StatRow>

          <Block>
            <BlockHeader title="Collabs en curso" count={collabs.length} href="/workspace/collabs" />
            {collabs.length === 0 ? (
              <EmptyState title="Sin collabs en curso" description="Cuando ganes una propuesta aparecerá aquí con sus piezas y fechas." />
            ) : (
              <CollabCardRow>
                {collabs.map((c) => {
                  const hito = siguienteHito(c)
                  return (
                    <CollabCard
                      key={c.id}
                      brand={marcaDe(c, marcas).nombre}
                      campaign={c.campana}
                      deliverables={describirEntregables(c)}
                      done={unidadesHechas(c)}
                      total={unidadesTotales(c)}
                      nextLabel={hito?.label ?? "Todo entregado"}
                      nextDate={hito?.fecha ?? c.hasta}
                      tint={c.tint}
                      coverUrl={c.coverUrl}
                      href={`/workspace/collabs/${c.id}`}
                    />
                  )
                })}
              </CollabCardRow>
            )}
          </Block>

          <Block>
            <BlockHeader title="Tareas" count={pendientes("hoy") + pendientes("semana") + pendientes("vencidas")} href="/workspace/tareas">
              <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)} className="sm:ml-2">
                <TabsList variant="line" className="flex-wrap">
                  {pestanas.map((p) => (
                    <TabsTrigger key={p.id} value={p.id}>
                      {p.label}
                      {pendientes(p.id) > 0 && (
                        <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{pendientes(p.id)}</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </BlockHeader>
            {visibles.length === 0 ? (
              <EmptyState
                title={pestana === "vencidas" ? "Nada vencido" : "Nada pendiente"}
                description={pestana === "vencidas" ? "Vas al día." : "Las tareas salen solas de las fechas de cada collab."}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {visibles.map((t) => (
                  <li key={t.id}>
                    <TaskCard
                      title={t.titulo}
                      context={contextoDeTarea(t, contexto)}
                      dueAt={t.fechaLimite ?? hoyFecha}
                      tone={pestana === "vencidas" ? "vencida" : pestana === "hoy" ? "hoy" : "normal"}
                      done={t.hecha}
                      onToggle={() => marcarTarea(t.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <ProfilePanel
            name={perfil.nombre}
            handle={perfil.handle}
            photoUrl={perfil.fotoUrl}
            niche={perfil.nicho}
            tier={perfil.tramo}
            city={perfil.ciudad}
            accounts={perfil.cuentas.map((c) => ({ network: c.red, handle: c.handle, url: c.url, followers: c.seguidores, avgViews: c.visualizacionesMedias }))}
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => toast("El media kit en PDF llega con Perfil y tarifas")}>
                  <FileTextIcon /> Media kit
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/workspace/perfil">Ver perfil</Link>
                </Button>
              </>
            }
          />

          <Block>
            <BlockHeader title="Avisos" count={avisos.filter((n) => !n.leido).length + (destacado.leido ? 0 : 1)} href="/workspace/avisos" hrefLabel="Ver todos" />
            <NoticeHighlight
              eyebrow="Red Astratic"
              title={destacado.titulo}
              description={destacado.descripcion}
              action={
                <Button size="sm" variant="secondary" className="w-fit" asChild>
                  <Link href={destacado.href ?? "/workspace/propuestas"}>Ver la propuesta</Link>
                </Button>
              }
            />
            <ul className="mt-3 flex flex-col">
              {avisos.map((n) => (
                <li key={n.id}>
                  <NoticeItem icon={iconoAviso[n.tipo]} title={n.titulo} description={n.descripcion} meta={fmt.relative(n.el, ahora)} unread={!n.leido} href={n.href ?? "/workspace/avisos"} />
                </li>
              ))}
            </ul>
          </Block>

          <Block>
            <BlockHeader
              title="Mis enlaces"
              action={
                <Button variant={editandoEnlaces ? "default" : "ghost"} size="sm" onClick={() => setEditandoEnlaces((e) => !e)}>
                  {editandoEnlaces ? (
                    "Listo"
                  ) : (
                    <>
                      <PencilIcon /> Editar
                    </>
                  )}
                </Button>
              }
            />
            {enlaces.length === 0 && !editandoEnlaces ? (
              <EmptyState
                title="Sin enlaces"
                description="Añade los que uses a diario: tu Drive, tus plantillas, tu gestoría…"
                action={
                  <Button size="sm" variant="outline" onClick={() => setEditandoEnlaces(true)}>
                    <PlusIcon /> Añadir enlace
                  </Button>
                }
              />
            ) : (
              <LinkGrid links={enlaces.map((e) => ({ id: e.id, label: e.etiqueta, url: e.url }))} onChange={(ls) => setEnlaces(ls.map((l) => ({ id: l.id, etiqueta: l.label, url: l.url })))} editing={editandoEnlaces} />
            )}
          </Block>
        </div>
      </div>

      <TaskDialog
        open={nuevaTarea}
        onOpenChange={setNuevaTarea}
        hoy={hoyFecha}
        relaciones={[
          ...collabs.map((c) => ({ tipo: "collab" as const, id: c.id, label: `${marcaDe(c, marcas).nombre} · ${c.campana}` })),
          ...propuestas.filter((p) => !p.collabId).map((p) => ({ tipo: "propuesta" as const, id: p.id, label: `Propuesta · ${marcaDe(p, marcas).nombre}` })),
        ]}
        onCreate={(t) => {
          setTareas((ts) => [t, ...ts])
          toast.success("Tarea creada")
        }}
      />
    </PageBody>
  )
}
