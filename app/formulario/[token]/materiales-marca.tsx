"use client"

import * as React from "react"
import { FileIcon, LinkIcon, PlusIcon, XIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ZonaSubida } from "@/components/influencer/zona-subida"

export type MaterialesEnviados = { archivos: { nombre: string; tamano: number }[]; enlaces: { nombre: string; url: string }[] }

export const SIN_MATERIALES: MaterialesEnviados = { archivos: [], enlaces: [] }

/** Lo que sube la marca: archivos (logos, fotos del producto, guía de claims) y enlaces (una carpeta de Drive). */
export function MaterialesMarca({ value, onChange }: { value: MaterialesEnviados; onChange: (v: MaterialesEnviados) => void }) {
  const [url, setUrl] = React.useState("")
  const urlValida = /^https?:\/\/\S+\.\S+/.test(url.trim())
  return (
    <div className="flex flex-col gap-3">
      {/* En el portal cada archivo sube directo a R2; aquí solo se apunta su nombre. */}
      <ZonaSubida onArchivos={(fs) => onChange({ ...value, archivos: [...value.archivos, ...fs.map((f) => ({ nombre: f.name, tamano: f.size }))] })} titulo="Arrastra aquí los archivos o elígelos" ayuda="Logos, fotos del producto, guía de claims, el brief en PDF…" />
      {value.archivos.length + value.enlaces.length > 0 && (
        <ul className="flex flex-col gap-1">
          {value.archivos.map((a, i) => (
            <li key={`a-${i}`} className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm">
              <FileIcon className="size-4 flex-none text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
              <span className="text-xs text-muted-foreground">{fmt.bytes(a.tamano)}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Quitar ${a.nombre}`} onClick={() => onChange({ ...value, archivos: value.archivos.filter((_, j) => j !== i) })}>
                <XIcon />
              </Button>
            </li>
          ))}
          {value.enlaces.map((e, i) => (
            <li key={`e-${i}`} className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm">
              <LinkIcon className="size-4 flex-none text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{e.url}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Quitar ${e.url}`} onClick={() => onChange({ ...value, enlaces: value.enlaces.filter((_, j) => j !== i) })}>
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="O pega un enlace: https://drive.google.com/…" aria-label="Enlace a una carpeta o archivo" />
        <Button
          type="button"
          variant="outline"
          disabled={!urlValida}
          onClick={() => {
            onChange({ ...value, enlaces: [...value.enlaces, { nombre: url.trim(), url: url.trim() }] })
            setUrl("")
          }}
        >
          <PlusIcon /> Añadir
        </Button>
      </div>
    </div>
  )
}
