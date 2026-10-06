"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { AlertTriangleIcon, CircleCheckIcon, InfoIcon, OctagonAlertIcon, PlusIcon } from "lucide-react"
import { cn } from "cn"
import type { Clausula } from "@/lib/influencer/modelo"
import type { StatusTone } from "@/lib/status"
import { GRUPOS_VARIABLE, VARIABLES_CONTRATO, variableDe, type Aviso } from "@/lib/influencer/contratos"
import { textoPlano } from "@/lib/influencer/guion"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const ICONO_AVISO: Record<StatusTone, typeof InfoIcon> = { danger: OctagonAlertIcon, warning: AlertTriangleIcon, info: InfoIcon, success: CircleCheckIcon, neutral: InfoIcon }
const COLOR_AVISO: Record<StatusTone, string> = { danger: "text-danger", warning: "text-warning", info: "text-info", success: "text-success", neutral: "text-muted-foreground" }

/** El texto de una cláusula con sus variables por su nombre, para leerla antes de insertarla. */
const vistaPrevia = (html: string) => textoPlano(html.replace(/<span data-variable="([a-z_.]+)">[^<]*<\/span>/g, (_, clave: string) => `[${variableDe(clave)?.label.toLowerCase() ?? clave}]`))

/**
 * El panel del editor de contratos: las variables con el dato de esta collab (pulsar inserta), la
 * biblioteca de cláusulas y la revisión de lo que conviene vigilar antes de firmar.
 */
export function PanelContrato({ editor, valores, clausulas, avisos, editable }: { editor: Editor | null; valores: Record<string, string | undefined>; clausulas: Clausula[]; avisos: Aviso[]; editable: boolean }) {
  const insertar = (contenido: string | { type: "variable"; attrs: { clave: string } }) => editor?.chain().focus().insertContent(contenido).run()
  const serios = avisos.filter((a) => a.tone === "danger" || a.tone === "warning").length

  return (
    <Tabs defaultValue={serios > 0 ? "revision" : "variables"} className="flex min-h-0 flex-1 flex-col gap-0">
      <TabsList variant="line" className="w-full justify-start border-b px-3">
        <TabsTrigger value="variables">Variables</TabsTrigger>
        <TabsTrigger value="clausulas">Cláusulas</TabsTrigger>
        <TabsTrigger value="revision">
          Revisión {serios > 0 && <span className="ml-1 rounded-full bg-warning-soft px-1.5 text-[10px] tabular-nums text-warning">{serios}</span>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="variables" className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-xs text-muted-foreground">{editable ? "Pulsa una variable para ponerla donde está el cursor, o escribe {{ y su nombre. Se rellena sola con los datos de la collab." : "Las variables se rellenan con los datos de la collab."}</p>
        {GRUPOS_VARIABLE.map((g) => (
          <div key={g} className="mb-3">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{g}</p>
            <ul className="flex flex-col">
              {VARIABLES_CONTRATO.filter((v) => v.grupo === g).map((v) => (
                <li key={v.clave}>
                  <button type="button" disabled={!editable} onClick={() => insertar({ type: "variable", attrs: { clave: v.clave } })} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px]">{v.label}</span>
                      <span className={cn("block truncate text-xs", valores[v.clave] ? "text-muted-foreground" : "text-warning")}>{valores[v.clave] ?? "Falta el dato"}</span>
                    </span>
                    {editable && <PlusIcon className="mt-0.5 size-3.5 flex-none text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="clausulas" className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-xs text-muted-foreground">Cláusulas tipo para añadir donde está el cursor. Llevan sus variables.</p>
        <ul className="flex flex-col gap-2">
          {clausulas.map((c) => (
            <li key={c.id} className="rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[13px] font-medium">{c.titulo}</span>
                <Button variant="ghost" size="sm" className="h-7" disabled={!editable} onClick={() => insertar(`<h3>${c.titulo}</h3>${c.texto}`)}>
                  <PlusIcon /> Añadir
                </Button>
              </div>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{vistaPrevia(c.texto)}</p>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="revision" className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-xs text-muted-foreground">Lo que más vigilan las creadoras antes de firmar, comprobado con el brief y el texto.</p>
        {avisos.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
            <CircleCheckIcon className="size-4" /> Nada que vigilar: rondas, derechos, exclusividad y pago en orden.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {avisos.map((a) => {
              const Icono = ICONO_AVISO[a.tone]
              return (
                <li key={a.id} className="flex items-start gap-2.5 rounded-lg border p-2.5">
                  <Icono className={cn("mt-0.5 size-4 flex-none", COLOR_AVISO[a.tone])} />
                  <span>
                    <span className="block text-[13px] font-medium">{a.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{a.detalle}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  )
}
