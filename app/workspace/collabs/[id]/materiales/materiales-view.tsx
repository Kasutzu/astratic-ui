"use client"

import * as React from "react"
import Image from "next/image"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DownloadIcon, EllipsisIcon, ExternalLinkIcon, FileArchiveIcon, FileIcon, FileTextIcon, FileVideoIcon, FolderOpenIcon, ImageIcon, LinkIcon, PlusIcon, Trash2Icon, UploadIcon, type LucideIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { TIPOS_MATERIAL, type Collab, type Material, type TipoMaterial } from "@/lib/influencer/modelo"
import { idNuevo } from "@/lib/influencer/tareas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/app/states"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { Block, BlockHeader } from "@/components/influencer/block"

const iconos: Record<TipoMaterial, LucideIcon> = { imagen: ImageIcon, video: FileVideoIcon, pdf: FileTextIcon, documento: FileIcon, enlace: LinkIcon, zip: FileArchiveIcon }

type Origen = "todos" | "marca" | "mia"

const esquemaEnlace = z.object({ nombre: z.string().trim().min(1, "Ponle nombre").max(80), url: z.string().trim().url("Pon la dirección completa, con https://") })
type ValoresEnlace = z.infer<typeof esquemaEnlace>

function tipoDeArchivo(archivo: File): TipoMaterial {
  if (archivo.type.startsWith("image/")) return "imagen"
  if (archivo.type.startsWith("video/")) return "video"
  if (archivo.type === "application/pdf") return "pdf"
  if (archivo.type.includes("zip")) return "zip"
  return "documento"
}

/** Los materiales de la collab: lo que manda la marca (brief, logos, producto, claims) y lo suyo (contrato, referencias). */
export function MaterialesView({ hoy, collab, materiales: iniciales }: { hoy: string; collab: Collab; materiales: Material[] }) {
  const [materiales, setMateriales] = React.useState(iniciales)
  const [origen, setOrigen] = React.useState<Origen>("todos")
  const [enlaceAbierto, setEnlaceAbierto] = React.useState(false)
  const [borrando, setBorrando] = React.useState<Material | null>(null)
  const archivoInput = React.useRef<HTMLInputElement>(null)
  const { register, handleSubmit, reset, formState } = useForm<ValoresEnlace>({ resolver: zodResolver(esquemaEnlace), defaultValues: { nombre: "", url: "" } })
  const { errors } = formState

  const visibles = materiales.filter((m) => origen === "todos" || m.origen === origen)

  const subir = (archivos: FileList | null) => {
    if (!archivos?.length) return
    const nuevos = Array.from(archivos).map<Material>((a) => ({ id: idNuevo("m"), collabId: collab.id, nombre: a.name, tipo: tipoDeArchivo(a), origen: "mia", tamano: a.size, url: "#", subidoEl: hoy }))
    setMateriales((ms) => [...nuevos, ...ms])
    toast.success(nuevos.length === 1 ? "Archivo subido" : `${nuevos.length} archivos subidos`)
  }

  const anadirEnlace = (v: ValoresEnlace) => {
    setMateriales((ms) => [{ id: idNuevo("m"), collabId: collab.id, nombre: v.nombre, tipo: "enlace", origen: "mia", url: v.url, subidoEl: hoy }, ...ms])
    setEnlaceAbierto(false)
    reset()
    toast.success("Enlace añadido")
  }

  const eliminar = (m: Material) => {
    const previas = materiales
    setMateriales((ms) => ms.filter((x) => x.id !== m.id))
    toast.success(`«${m.nombre}» eliminado`, { action: { label: "Deshacer", onClick: () => setMateriales(previas) } })
  }

  return (
    <>
      <Block>
        <BlockHeader
          title="Materiales"
          count={materiales.length}
          action={
            <>
              <Button variant="outline" size="sm" onClick={() => setEnlaceAbierto(true)}>
                <LinkIcon /> Añadir enlace
              </Button>
              <Button size="sm" onClick={() => archivoInput.current?.click()}>
                <UploadIcon /> Subir archivo
              </Button>
              <input ref={archivoInput} type="file" multiple className="hidden" aria-label="Subir archivos" onChange={(e) => subir(e.target.files)} />
            </>
          }
        >
          <Tabs value={origen} onValueChange={(v) => setOrigen(v as Origen)} className="sm:ml-2">
            <TabsList variant="line">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="marca">De la marca <span className="ml-1 text-[11px] text-muted-foreground">{materiales.filter((m) => m.origen === "marca").length}</span></TabsTrigger>
              <TabsTrigger value="mia">Míos <span className="ml-1 text-[11px] text-muted-foreground">{materiales.filter((m) => m.origen === "mia").length}</span></TabsTrigger>
            </TabsList>
          </Tabs>
        </BlockHeader>

        {visibles.length === 0 ? (
          <EmptyState icon={FolderOpenIcon} title="Sin materiales" description="Sube lo que te mande la marca (brief, logos, fotos del producto, guía de claims) y lo tuyo (el contrato firmado). Puedes arrastrar varios archivos." action={<Button size="sm" variant="outline" onClick={() => archivoInput.current?.click()}><PlusIcon /> Subir archivo</Button>} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visibles.map((m) => {
              const Icono = iconos[m.tipo]
              return (
                <li key={m.id} className="group relative flex flex-col overflow-hidden rounded-xl bg-background/70 transition-colors hover:bg-muted">
                  <a href={m.url} target={m.tipo === "enlace" ? "_blank" : undefined} rel="noreferrer" className={cn("relative block h-28", !m.previewUrl && "grid place-items-center")}>
                    {m.previewUrl ? <Image src={m.previewUrl} alt="" fill sizes="300px" className="object-cover" /> : <Icono className="size-8 text-muted-foreground" />}
                  </a>
                  <div className="flex items-start gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {TIPOS_MATERIAL[m.tipo]}
                        {m.tamano ? ` · ${fmt.bytes(m.tamano)}` : ""} · {fmt.date(m.subidoEl)}
                      </p>
                      {m.descripcion && <p className="mt-1 truncate text-xs text-muted-foreground">{m.descripcion}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Más acciones" className="-mr-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100">
                          <EllipsisIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={m.url} target="_blank" rel="noreferrer">
                            <ExternalLinkIcon /> Abrir
                          </a>
                        </DropdownMenuItem>
                        {m.tipo !== "enlace" && (
                          <DropdownMenuItem onClick={() => toast.success("Descarga preparada")}>
                            <DownloadIcon /> Descargar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setBorrando(m)}>
                          <Trash2Icon /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <span className={cn("absolute top-2 left-2 rounded-md px-1.5 py-px text-[11px] font-medium", m.origen === "marca" ? "bg-card text-card-foreground shadow-xs" : "bg-brand text-brand-foreground")}>{m.origen === "marca" ? "Marca" : "Mío"}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Block>

      <Dialog open={enlaceAbierto} onOpenChange={setEnlaceAbierto}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Añadir enlace</DialogTitle>
            <DialogDescription>Una carpeta de Drive, un tablero de referencias, la landing de la campaña.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(anadirEnlace)} noValidate className="grid gap-4">
            <Field data-invalid={!!errors.nombre || undefined}>
              <FieldLabel htmlFor="mat-nombre">Nombre</FieldLabel>
              <Input id="mat-nombre" placeholder="Referencias de la marca" autoFocus aria-invalid={!!errors.nombre} {...register("nombre")} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={!!errors.url || undefined}>
              <FieldLabel htmlFor="mat-url">Dirección</FieldLabel>
              <Input id="mat-url" type="url" placeholder="https://" aria-invalid={!!errors.url} {...register("url")} />
              <FieldError errors={[errors.url]} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEnlaceAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit">Añadir enlace</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={borrando !== null}
        onOpenChange={(o) => !o && setBorrando(null)}
        title={`¿Eliminar «${borrando?.nombre ?? ""}»?`}
        description={borrando?.origen === "marca" ? "Es un archivo de la marca: si lo necesitas luego tendrás que pedirlo otra vez." : "Se quita de esta collab."}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (borrando) eliminar(borrando)
        }}
      />
    </>
  )
}
