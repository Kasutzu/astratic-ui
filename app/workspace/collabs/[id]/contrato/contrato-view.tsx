"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { toast } from "sonner"
import { EyeIcon, FilePenLineIcon, PenLineIcon, PrinterIcon } from "lucide-react"
import { ESTADOS_CONTRATO, estadoDe, type Clausula, type Contrato, type DatosFiscales, type PlantillaContrato } from "@/lib/influencer/modelo"
import { revisarContrato, valoresDeContrato, variableDe } from "@/lib/influencer/contratos"
import { caducidad, tokenNuevo } from "@/lib/influencer/formularios"
import { idNuevo } from "@/lib/influencer/tareas"
import { guardarBorrador } from "@/lib/influencer/borradores"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/app/status-badge"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { EditorTexto } from "@/components/influencer/editor-texto"
import { PlantillasMenu } from "@/components/influencer/plantillas-menu"
import { CompartirEnlace, CompartirEnlaceDialog } from "@/components/influencer/compartir-enlace"
import { useCollab } from "../collab-provider"
import { PanelContrato } from "./panel-contrato"
import { ContratoInicio } from "./contrato-inicio"
import { ContratoExterno } from "./contrato-externo"
import { FirmarDialog } from "./firmar-dialog"
import { Firmas } from "@/components/influencer/firmas-contrato"

/**
 * El contrato de la collab: un editor de documento con variables que se rellenan con los datos de
 * la collab, plantillas y cláusulas tipo, la revisión de lo que conviene vigilar, la vista previa en
 * PDF y la firma de las dos partes (ella aquí, la marca por enlace sin cuenta).
 */
export function ContratoView({ plantillas: iniciales, clausulas, fiscales }: { plantillas: PlantillaContrato[]; clausulas: Clausula[]; fiscales: DatosFiscales }) {
  const { collab, marca, perfil, hoy, contrato: [contrato, setContrato] } = useCollab()
  const [plantillas, setPlantillas] = React.useState(iniciales)
  const [editor, setEditor] = React.useState<Editor | null>(null)
  const [verDatos, setVerDatos] = React.useState(false)
  const [firmando, setFirmando] = React.useState(false)
  const [compartir, setCompartir] = React.useState(false)
  const [reabriendo, setReabriendo] = React.useState(false)
  const valores = valoresDeContrato({ collab, marca, perfil, fiscales, hoy })
  const contacto = collab.brief.contacto.nombre || marca.nombre

  // Solo en este repo: la página de la marca (otra pestaña) lee el contrato del navegador.
  const publicar = (c: Contrato) => c.enlace && guardarBorrador(`contrato:${c.enlace.token}`, { registro: c, collab, marca })

  const nuevo = (datos: Partial<Contrato>): Contrato => ({ id: idNuevo("ct"), collabId: collab.id, titulo: `Contrato de colaboración · ${collab.campana}`, texto: "", estado: "borrador", firmas: [], enlace: { token: tokenNuevo("ct"), caduca: caducidad(hoy) }, actualizadoEl: hoy, ...datos })

  if (!contrato)
    return (
      <ContratoInicio
        plantillas={plantillas}
        onPlantilla={(p) => {
          setContrato(nuevo({ texto: p?.texto ?? "", plantillaId: p?.id }))
          if (p) toast.success(`Contrato creado desde «${p.nombre}» con los datos de la collab`)
        }}
        onSubir={(archivo) => {
          setContrato(nuevo({ titulo: archivo.name, externo: { nombre: archivo.name, tamano: archivo.size } }))
          toast.success("Contrato subido: revísalo con la lista antes de firmar")
        }}
      />
    )

  if (contrato.externo) return <ContratoExterno contrato={contrato} suNombre={fiscales.nombre} contacto={contacto} hoy={hoy} onCambiar={setContrato} onQuitar={() => setContrato(null)} />

  const editable = contrato.estado === "borrador"
  const estado = estadoDe(ESTADOS_CONTRATO, contrato.estado)
  const avisos = revisarContrato({ collab, texto: contrato.texto, valores })
  const ruta = contrato.enlace ? `/contrato/${contrato.enlace.token}` : null

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <input
            value={contrato.titulo}
            onChange={(e) => setContrato({ ...contrato, titulo: e.target.value })}
            readOnly={!editable}
            aria-label="Título del contrato"
            className="min-w-[240px] flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-semibold outline-none hover:bg-muted focus-visible:bg-muted read-only:hover:bg-transparent"
          />
          <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
          <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm">
            <Switch checked={verDatos} onCheckedChange={setVerDatos} aria-label="Ver con los datos de la collab" /> Ver con los datos
          </label>
          <PlantillasMenu que="contrato" plantillas={plantillas} onGuardar={(p) => setPlantillas((ps) => [...ps, { ...p, actualizadaEl: hoy }])} texto={contrato.texto} disabled={!editable} onAplicar={(html) => setContrato({ ...contrato, texto: html })} />
          {ruta && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                publicar(contrato)
                window.open(ruta, "_blank", "noopener")
              }}
            >
              {contrato.estado === "firmado" ? <PrinterIcon /> : <EyeIcon />} {contrato.estado === "firmado" ? "Descargar PDF" : "Vista previa"}
            </Button>
          )}
          {editable && (
            <Button size="sm" onClick={() => setFirmando(true)}>
              <PenLineIcon /> Firmar y enviar
            </Button>
          )}
        </div>
        <div className="flex-1 bg-muted/50 p-3 md:p-8">
          <div className="mx-auto max-w-[820px] overflow-hidden rounded-lg bg-card shadow-card">
            <EditorTexto
              value={contrato.texto}
              onChange={editable ? (html) => setContrato((c) => (c ? { ...c, texto: html, actualizadoEl: hoy } : c)) : undefined}
              editable={editable}
              placeholder="Escribe el contrato o empieza desde una plantilla…"
              variables={{ valores, verDatos, etiqueta: (c) => variableDe(c)?.label ?? c }}
              onEditor={setEditor}
              contenidoClassName="min-h-[760px] px-8 py-10 md:px-14"
            />
          </div>
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-5">
        <section className="rounded-2xl bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Firmas</h3>
          <Firmas contrato={contrato} suNombre={fiscales.nombre} marca={contacto} />
          {contrato.estado === "enviado" && ruta && (
            <div className="mt-4 border-t pt-4">
              <CompartirEnlace ruta={ruta} mensaje={`Hola ${contacto.split(" ")[0]}, aquí tienes el contrato de «${collab.campana}» para leerlo y firmarlo:`} asunto={`Contrato · ${collab.campana}`} email={collab.brief.contacto.email} verComo="Ver como la marca" />
              <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={() => setReabriendo(true)}>
                <FilePenLineIcon /> Editar el texto (anula tu firma)
              </Button>
            </div>
          )}
        </section>
        <section className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
          <PanelContrato editor={editor} valores={valores} clausulas={clausulas} avisos={avisos} editable={editable} />
        </section>
      </aside>

      <FirmarDialog
        open={firmando}
        onOpenChange={setFirmando}
        nombre={fiscales.nombre}
        onFirmar={(nombre) => {
          const firmado: Contrato = { ...contrato, estado: "enviado", firmas: [{ lado: "influencer", nombre, el: hoy }], actualizadoEl: hoy }
          setContrato(firmado)
          publicar(firmado)
          setCompartir(true)
        }}
      />
      {compartir && ruta && (
        <CompartirEnlaceDialog
          open
          onOpenChange={setCompartir}
          titulo="Firmado: ahora la marca"
          descripcion={`Mándale el enlace a ${contacto}: lo lee y firma sin cuenta. Te avisamos al momento.`}
          ruta={ruta}
          mensaje={`Hola ${contacto.split(" ")[0]}, aquí tienes el contrato de «${collab.campana}» para leerlo y firmarlo:`}
          asunto={`Contrato · ${collab.campana}`}
          email={collab.brief.contacto.email}
        />
      )}
      <ConfirmDialog
        open={reabriendo}
        onOpenChange={setReabriendo}
        title="¿Editar el contrato?"
        description="Vuelve a borrador y se anula tu firma: tendrás que firmarlo y mandarlo otra vez. El enlace que tiene la marca deja de servir para firmar."
        confirmLabel="Volver a borrador"
        destructive
        onConfirm={() => setContrato({ ...contrato, estado: "borrador", firmas: [], enlace: { token: tokenNuevo("ct"), caduca: caducidad(hoy) } })}
      />
    </div>
  )
}
