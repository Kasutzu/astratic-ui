"use client"

import * as React from "react"
import Link from "next/link"
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
import type { Collab, InfluencerProfile, Notice, NoticeKind, QuickLink, Task, TaskBucket } from "@/lib/influencer/demo-data"
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

const noticeIcon: Record<NoticeKind, LucideIcon> = {
  oportunidad: SparklesIcon,
  cambios: MessageSquareWarningIcon,
  aprobado: CircleCheckIcon,
  cobro: BanknoteIcon,
  astratic: BellRingIcon,
}

const buckets: { id: TaskBucket; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "vencidas", label: "Vencidas" },
]

export function InicioView({
  greeting,
  now,
  profile,
  stats,
  collabs,
  tasks: initialTasks,
  highlight,
  notices,
  links: initialLinks,
}: {
  greeting: string
  now: string
  profile: InfluencerProfile
  stats: { pendingAmount: number; collectedThisYear: number; activeCollabs: number; openProposals: number }
  collabs: Collab[]
  tasks: Task[]
  highlight: Notice
  notices: Notice[]
  links: QuickLink[]
}) {
  const [tasks, setTasks] = React.useState(initialTasks)
  const [bucket, setBucket] = React.useState<TaskBucket>("hoy")
  const [links, setLinks] = React.useState(initialLinks)
  const [editingLinks, setEditingLinks] = React.useState(false)
  const today = new Date(now)

  const pending = (b: TaskBucket) => tasks.filter((t) => t.bucket === b && !t.done).length
  const visibleTasks = tasks.filter((t) => t.bucket === bucket)
  const overdue = pending("vencidas")
  const dueToday = pending("hoy")

  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  const urgente =
    overdue > 0 || dueToday > 0
      ? [overdue > 0 && `${overdue} ${overdue === 1 ? "tarea vencida" : "tareas vencidas"}`, dueToday > 0 && `${dueToday} para hoy`]
          .filter(Boolean)
          .join(" y ")
      : "nada urgente"

  return (
    <PageBody className="gap-6 px-4 pb-28 md:px-[34px] md:pb-10">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{fmt.dateLong(today)}</p>
          <h1 className="mt-1 text-[27px] leading-tight font-semibold tracking-tight">
            {greeting}, {profile.firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tienes <button type="button" onClick={() => setBucket(overdue > 0 ? "vencidas" : "hoy")} className="font-medium text-foreground underline-offset-2 hover:underline">{urgente}</button>.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="mt-5 flex-none">
              <PlusIcon /> Nuevo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => toast("Las propuestas llegan con su página")}>Propuesta</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast("Las collabs llegan con su página")}>Collab</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast("Las tareas nuevas llegan con la página de Collabs")}>Tarea</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditingLinks(true)}>Enlace</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_372px]">
        <div className="flex min-w-0 flex-col gap-6">
          <StatRow>
            <StatTile icon={WalletIcon} label="Pendiente de cobro" value={fmt.eur(stats.pendingAmount)} tint="peach" href="/workspace/cobros" />
            <StatTile icon={BanknoteIcon} label="Cobrado este año" value={fmt.eur(stats.collectedThisYear)} tint="mint" href="/workspace/cobros" />
            <StatTile icon={SparklesIcon} label="Collabs en curso" value={stats.activeCollabs} tint="rose" href="/workspace/collabs" />
            <StatTile icon={KanbanSquareIcon} label="Propuestas abiertas" value={stats.openProposals} tint="sky" href="/workspace/propuestas" />
          </StatRow>

          <Block>
            <BlockHeader title="Collabs en curso" count={collabs.length} href="/workspace/collabs" />
            {collabs.length === 0 ? (
              <EmptyState title="Sin collabs en curso" description="Cuando ganes una propuesta aparecerá aquí con sus piezas y fechas." />
            ) : (
              <CollabCardRow>
                {collabs.map((c) => (
                  <CollabCard
                    key={c.id}
                    brand={c.brand}
                    campaign={c.campaign}
                    deliverables={c.deliverables}
                    done={c.done}
                    total={c.total}
                    nextLabel={c.nextLabel}
                    nextDate={c.nextDate}
                    tint={c.tint}
                    coverUrl={c.coverUrl}
                    href={`/workspace/collabs/${c.id}`}
                  />
                ))}
              </CollabCardRow>
            )}
          </Block>

          <Block>
            <BlockHeader title="Tareas" count={pending("hoy") + pending("semana") + pending("vencidas")} href="/workspace/collabs/tareas">
              <Tabs value={bucket} onValueChange={(v) => setBucket(v as TaskBucket)} className="sm:ml-2">
                <TabsList variant="line" className="flex-wrap">
                  {buckets.map((b) => (
                    <TabsTrigger key={b.id} value={b.id}>
                      {b.label}
                      {pending(b.id) > 0 && (
                        <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{pending(b.id)}</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </BlockHeader>
            {visibleTasks.length === 0 ? (
              <EmptyState
                title={bucket === "vencidas" ? "Nada vencido" : "Nada pendiente"}
                description={bucket === "vencidas" ? "Vas al día." : "Las tareas salen solas de las fechas de cada collab."}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleTasks.map((t) => (
                  <li key={t.id}>
                    <TaskCard
                      title={t.title}
                      context={t.context}
                      dueAt={t.dueAt}
                      tone={t.bucket === "vencidas" ? "vencida" : t.bucket === "hoy" ? "hoy" : "normal"}
                      done={t.done}
                      onToggle={() => toggleTask(t.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <ProfilePanel
            name={profile.name}
            handle={profile.handle}
            photoUrl={profile.photoUrl}
            niche={profile.niche}
            tier={profile.tier}
            city={profile.city}
            accounts={profile.accounts}
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
            <BlockHeader title="Avisos" count={notices.filter((n) => n.unread).length + (highlight.unread ? 1 : 0)} href="/workspace/avisos" hrefLabel="Ver todos" />
            <NoticeHighlight
              eyebrow="Red Astratic"
              title={highlight.title}
              description={highlight.description}
              action={
                <Button size="sm" variant="secondary" className="w-fit" asChild>
                  <Link href="/workspace/propuestas">Ver la propuesta</Link>
                </Button>
              }
            />
            <ul className="mt-3 flex flex-col">
              {notices.map((n) => (
                <li key={n.id}>
                  <NoticeItem
                    icon={noticeIcon[n.kind]}
                    title={n.title}
                    description={n.description}
                    meta={fmt.relative(n.at, today)}
                    unread={n.unread}
                    href="/workspace/avisos"
                  />
                </li>
              ))}
            </ul>
          </Block>

          <Block>
            <BlockHeader
              title="Mis enlaces"
              action={
                <Button variant={editingLinks ? "default" : "ghost"} size="sm" onClick={() => setEditingLinks((e) => !e)}>
                  {editingLinks ? (
                    "Listo"
                  ) : (
                    <>
                      <PencilIcon /> Editar
                    </>
                  )}
                </Button>
              }
            />
            {links.length === 0 && !editingLinks ? (
              <EmptyState
                title="Sin enlaces"
                description="Añade los que uses a diario: tu Drive, tus plantillas, tu gestoría…"
                action={
                  <Button size="sm" variant="outline" onClick={() => setEditingLinks(true)}>
                    <PlusIcon /> Añadir enlace
                  </Button>
                }
              />
            ) : (
              <LinkGrid links={links} onChange={setLinks} editing={editingLinks} />
            )}
          </Block>
        </div>
      </div>
    </PageBody>
  )
}
