"use client"

import * as React from "react"
import { toast } from "sonner"
import { BanIcon, CopyIcon, EllipsisIcon, MegaphoneIcon, PlusIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { ESTADOS_COLLAB, TIPOS_COLLAB, estadoDe, type Collab, type Marca } from "@/lib/influencer/modelo"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/app/page-header"
import { PageTabs } from "@/components/app/page-tabs"
import { StatusBadge } from "@/components/app/status-badge"
import { useBreadcrumb } from "@/components/app/app-shell"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { BrandMark } from "@/components/influencer/brand-mark"
import { TaskDialog } from "@/components/influencer/task-dialog"
import { collabTabs } from "@/app/workspace/nav"

/** Cabecera de la ficha de collab: marca, campaña, estado, lo que vale, las fechas y sus pestañas. */
export function CollabHeader({ collab, marca, tareasPendientes, hoy }: { collab: Collab; marca: Marca; tareasPendientes: number; hoy: string }) {
  useBreadcrumb([{ label: `${marca.nombre} · ${collab.campana}` }])
  const [estado, setEstado] = React.useState(collab.estado)
  const [nuevaTarea, setNuevaTarea] = React.useState(false)
  const [cancelando, setCancelando] = React.useState(false)
  const e = estadoDe(ESTADOS_COLLAB, estado)

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <BrandMark name={marca.nombre} tint={collab.tint} size="lg" />
            <span className="min-w-0">
              <span className="block truncate">{collab.campana}</span>
              <span className="block text-sm font-normal text-muted-foreground">{marca.nombre}</span>
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge tone={e.tone}>{e.label}</StatusBadge>
            <span>{TIPOS_COLLAB[collab.tipo].label}</span>
            <span>·</span>
            <span className="font-medium text-foreground tabular-nums">{fmt.eur(collab.importeNeto ?? collab.importe)}</span>
            {collab.importeNeto && <span>({fmt.eur(collab.importe)} brutos, el 80 % para ti)</span>}
            <span>·</span>
            <span>
              {fmt.date(collab.desde)} – {fmt.date(collab.hasta)}
            </span>
          </span>
        }
        tabs={<PageTabs items={collabTabs(collab.id, { piezas: collab.piezas.length, tareas: tareasPendientes })} />}
        actions={
          <>
            <Button variant="outline" onClick={() => setNuevaTarea(true)}>
              <PlusIcon /> Nueva tarea
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Más acciones">
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    await navigator.clipboard.writeText(window.location.href)
                    toast.success("Enlace copiado")
                  }}
                >
                  <CopyIcon /> Copiar enlace
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={estado === "publicada" || estado === "cerrada"}
                  onClick={() => {
                    setEstado("publicada")
                    toast.success("Collab marcada como publicada")
                  }}
                >
                  <MegaphoneIcon /> Marcar como publicada
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={estado === "cancelada"} onClick={() => setCancelando(true)}>
                  <BanIcon /> Cancelar collab
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <TaskDialog
        open={nuevaTarea}
        onOpenChange={setNuevaTarea}
        hoy={soloFecha(hoy)}
        relacionFija={{ tipo: "collab", id: collab.id, label: `${marca.nombre} · ${collab.campana}` }}
        onCreate={() => toast.success("Tarea creada: la verás en la pestaña Tareas y en tu lista general")}
      />
      <ConfirmDialog
        open={cancelando}
        onOpenChange={setCancelando}
        title="¿Cancelar esta collab?"
        description="Se queda en el historial como cancelada, con sus contenidos y materiales. Las tareas pendientes se cierran."
        confirmLabel="Cancelar la collab"
        destructive
        onConfirm={() => {
          setEstado("cancelada")
          toast.success("Collab cancelada")
        }}
      />
    </>
  )
}
