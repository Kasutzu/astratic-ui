"use client"

import { LinkIcon, PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react"
import { cn } from "cn"
import { fmt } from "@/lib/format"
import { ESTADOS_VERSION, estadoDe, type Pieza, type Version } from "@/lib/influencer/modelo"
import { diasEsperando } from "@/lib/influencer/collabs"
import { soloFecha } from "@/lib/influencer/fechas"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CompartirEnlace } from "@/components/influencer/compartir-enlace"

const PUNTO: Record<Version["estado"], string> = { aprobada: "bg-success", cambios: "bg-warning", "en-revision": "bg-info", borrador: "bg-muted-foreground/50" }

/** v1 · v2 · v3, cada una con el punto de su estado, como en Feedback. */
export function VersionesTabs({ versiones, activa, onElegir }: { versiones: Version[]; activa: string | null; onElegir: (id: string) => void }) {
  if (versiones.length === 0) return null
  return (
    <div role="tablist" aria-label="Versiones" className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-muted p-[3px]">
      {versiones.map((v) => (
        <Tooltip key={v.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="tab"
              aria-selected={v.id === activa}
              onClick={() => onElegir(v.id)}
              className={cn("inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors", v.id === activa ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              v{v.numero}
              <span className={cn("size-1.5 rounded-full", PUNTO[v.estado])} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {fmt.date(v.creadaEl)} · {estadoDe(ESTADOS_VERSION, v.estado).label.toLowerCase()}
            {v.aprobada ? ` por ${v.aprobada.por}` : ""}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

/** Dónde está la versión: «En revisión de Clara desde hace 2 días», «Aprobada por Inés el 28 sep». */
export function situacionDe(v: Version, contacto: string, hoy: string) {
  switch (v.estado) {
    case "borrador":
      return "Borrador: solo lo ves tú hasta que lo envíes"
    case "en-revision": {
      const dias = diasEsperando(v, soloFecha(hoy))
      return `En revisión de ${contacto || "la marca"} ${dias === 0 ? "desde hoy" : `desde hace ${dias} ${dias === 1 ? "día" : "días"}`}`
    }
    case "cambios":
      return `${contacto || "La marca"} ha pedido cambios`
    case "aprobada":
      return v.aprobada ? `Aprobada por ${v.aprobada.por} el ${fmt.date(v.aprobada.el)} a las ${fmt.time(v.aprobada.el)}` : "Aprobada"
  }
}

/** El enlace de revisión de la versión, para volver a mandarlo o abrirlo como la marca. */
export function EnlaceRevisionBoton({ version, pieza, contacto }: { version: Version; pieza: Pieza; contacto: { nombre: string; email: string } }) {
  if (!version.enlace) return null
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon /> Enlace
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px]">
        <p className="mb-2 text-sm font-medium">Enlace de revisión · v{version.numero}</p>
        <CompartirEnlace
          ruta={`/revisar/${version.enlace.token}`}
          mensaje={`Hola ${contacto.nombre.split(" ")[0] || ""}, aquí tienes la v${version.numero} de «${pieza.titulo}» para revisar:`}
          asunto={`${pieza.titulo} · v${version.numero} para revisar`}
          email={contacto.email}
          nota={`Sin cuenta: lee, comenta y aprueba. Caduca el ${fmt.date(version.enlace.caduca)}.`}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Enseñar u ocultar el panel de la conversación. */
export function BotonPanel({ abierto, onCambiar, pendientes }: { abierto: boolean; onCambiar: () => void; pendientes: number }) {
  return (
    <Button variant="ghost" size="icon-sm" className="relative" aria-label={abierto ? "Ocultar la conversación" : "Ver la conversación"} aria-pressed={abierto} onClick={onCambiar}>
      {abierto ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
      {!abierto && pendientes > 0 && <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">{pendientes}</span>}
    </Button>
  )
}
