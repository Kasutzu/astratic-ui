"use client"

import * as React from "react"
import type { Collab, Marca, Tarea } from "@/lib/influencer/modelo"
import { soloFecha } from "@/lib/influencer/fechas"
import { Block, BlockHeader } from "@/components/influencer/block"
import { TaskTable } from "@/components/influencer/task-table"

/** Las tareas de esta collab: las automáticas de las fechas del brief y las suyas. Aparecen también en la lista general. */
export function TareasCollabView({ hoy, collab, marca, tareas: iniciales }: { hoy: string; collab: Collab; marca: Marca; tareas: Tarea[] }) {
  const [tareas, setTareas] = React.useState(iniciales)
  return (
    <Block>
      <BlockHeader title="Tareas de la collab" count={tareas.filter((t) => !t.hecha).length} href="/workspace/tareas" hrefLabel="Todas mis tareas" />
      <TaskTable
        tareas={tareas}
        hoy={soloFecha(hoy)}
        relacionFija={{ tipo: "collab", id: collab.id, label: `${marca.nombre} · ${collab.campana}` }}
        onToggle={(id) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)))}
        onUpdate={(t) => setTareas((ts) => ts.map((x) => (x.id === t.id ? t : x)))}
        onCreate={(t) => setTareas((ts) => [...ts, t])}
        onDelete={(ids) => setTareas((ts) => ts.filter((t) => !ids.includes(t.id)))}
      />
    </Block>
  )
}
