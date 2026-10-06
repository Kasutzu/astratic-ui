"use client"

import * as React from "react"
import { toast } from "sonner"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ClapperboardIcon, PlusIcon } from "lucide-react"
import { FORMATOS, LISTA_FORMATOS, type Collab, type Pieza } from "@/lib/influencer/modelo"
import { idNuevo } from "@/lib/influencer/tareas"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/app/states"
import { Block, BlockHeader } from "@/components/influencer/block"
import { PiezaCard } from "@/components/influencer/pieza-card"

type Filtro = "todas" | "me-toca" | "esperando" | "aprobadas" | "publicadas"

const FILTROS: { id: Filtro; label: string; cumple: (p: Pieza) => boolean }[] = [
  { id: "todas", label: "Todas", cumple: () => true },
  { id: "me-toca", label: "Me toca", cumple: (p) => p.estado === "borrador" || p.estado === "cambios" || p.estado === "aprobado" },
  { id: "esperando", label: "Esperando a la marca", cumple: (p) => p.estado === "en-revision" },
  { id: "aprobadas", label: "Aprobadas", cumple: (p) => p.estado === "aprobado" || p.estado === "programado" },
  { id: "publicadas", label: "Publicadas", cumple: (p) => p.estado === "publicado" || p.estado === "resultados" },
]

const esquema = z.object({
  titulo: z.string().trim().min(1, "Ponle nombre").max(80),
  formato: z.enum(LISTA_FORMATOS),
  publicacion: z.string().min(1, "Falta la fecha"),
})

type Valores = z.infer<typeof esquema>

/** La biblioteca de la collab: cada pieza con su estado y lo que le toca; abrirla lleva a sus versiones. */
export function ContenidosView({ hoy, collab }: { hoy: string; collab: Collab }) {
  const [piezas, setPiezas] = React.useState(collab.piezas)
  const [filtro, setFiltro] = React.useState<Filtro>("todas")
  const [nueva, setNueva] = React.useState(false)
  const { register, handleSubmit, control, reset, formState } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { titulo: "", formato: "reel", publicacion: collab.hasta } })
  const { errors } = formState
  const visibles = piezas.filter(FILTROS.find((f) => f.id === filtro)?.cumple ?? (() => true))

  const crear = (v: Valores) => {
    setPiezas((ps) => [...ps, { id: idNuevo("pz"), collabId: collab.id, formato: v.formato, unidades: 1, titulo: v.titulo, publicacion: v.publicacion, estado: "borrador", guion: [], video: [], rondaActual: 1 }])
    setNueva(false)
    reset()
    toast.success("Pieza añadida")
  }

  return (
    <>
      <Block>
        <BlockHeader
          title="Piezas"
          count={piezas.length}
          action={
            <Button size="sm" onClick={() => setNueva(true)}>
              <PlusIcon /> Nueva pieza
            </Button>
          }
        >
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)} className="sm:ml-2">
            <TabsList variant="line" className="flex-wrap">
              {FILTROS.map((f) => {
                const n = piezas.filter(f.cumple).length
                return (
                  <TabsTrigger key={f.id} value={f.id} disabled={n === 0 && f.id !== "todas"}>
                    {f.label}
                    {n > 0 && f.id !== "todas" && <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{n}</span>}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </BlockHeader>
        {visibles.length === 0 ? (
          <EmptyState icon={ClapperboardIcon} title={filtro === "todas" ? "Sin piezas" : "Nada aquí"} description={filtro === "todas" ? "Añade las piezas del brief: cada una tendrá su guion, sus vídeos y su enlace de revisión." : "Cambia el filtro para ver el resto."} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibles.map((p) => (
              <PiezaCard key={p.id} pieza={p} tint={collab.tint} hoy={soloFecha(hoy)} href={`/workspace/collabs/${collab.id}/contenidos/${p.id}`} />
            ))}
          </div>
        )}
      </Block>

      <Dialog open={nueva} onOpenChange={setNueva}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nueva pieza</DialogTitle>
            <DialogDescription>De la fecha de publicación salen el resto de fechas: guion 10 días antes, V1 5 días antes y resultados 7 después.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(crear)} noValidate className="grid gap-4">
            <Field data-invalid={!!errors.titulo || undefined}>
              <FieldLabel htmlFor="pz-titulo">Nombre</FieldLabel>
              <Input id="pz-titulo" placeholder="Reel · Antes y después" autoFocus aria-invalid={!!errors.titulo} {...register("titulo")} />
              <FieldError errors={[errors.titulo]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pz-formato">Formato</FieldLabel>
                <Controller
                  control={control}
                  name="formato"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="pz-formato" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LISTA_FORMATOS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FORMATOS[f].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field data-invalid={!!errors.publicacion || undefined}>
                <FieldLabel htmlFor="pz-fecha">Publicación</FieldLabel>
                <Input id="pz-fecha" type="date" aria-invalid={!!errors.publicacion} {...register("publicacion")} />
                <FieldError errors={[errors.publicacion]} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNueva(false)}>
                Cancelar
              </Button>
              <Button type="submit">Añadir pieza</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
