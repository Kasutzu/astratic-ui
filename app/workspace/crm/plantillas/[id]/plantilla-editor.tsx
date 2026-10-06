"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftIcon, BracesIcon, CopyIcon, CopyPlusIcon, EllipsisIcon, EyeIcon, FileTextIcon, SaveIcon, StarIcon, Trash2Icon } from "lucide-react"
import { cn } from "cn"
import { CANALES_PLANTILLA, USOS_PLANTILLA, type CanalPlantilla, type Plantilla, type UsoPlantilla } from "@/lib/influencer/modelo"
import { GRUPOS_VARIABLE, VARIABLES, contextoPlantilla, etiquetaVariable, rellenar, trozos, variablesDe, variablesSinValor } from "@/lib/influencer/plantillas"
import { idNuevo } from "@/lib/influencer/tareas"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageBody, PageHeader } from "@/components/app/page-header"
import { Section, SectionBody, SectionFooter, SectionHeader } from "@/components/app/section"
import { EmptyState } from "@/components/app/states"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useBreadcrumb } from "@/components/app/app-shell"
import { useOrigen } from "@/components/influencer/navegador"
import { useCrm } from "../../crm-provider"

type Borrador = Pick<Plantilla, "nombre" | "uso" | "canal" | "asunto" | "cuerpo">

const NINGUNA = "__ninguna__"

/** La plantilla abierta: se edita a la izquierda y a la derecha se ve tal cual le llegaría a una marca. */
export function PlantillaEditor({ id }: { id: string }) {
  const { plantillas } = useCrm()
  const plantilla = plantillas.find((p) => p.id === id)
  if (!plantilla) {
    return (
      <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10">
        <EmptyState icon={FileTextIcon} title="Esta plantilla no existe" description="Puede que se haya borrado." action={<Button asChild variant="outline" size="sm"><Link href="/workspace/crm/plantillas">Volver a las plantillas</Link></Button>} />
      </PageBody>
    )
  }
  return <Editor key={plantilla.id} plantilla={plantilla} />
}

function Editor({ plantilla }: { plantilla: Plantilla }) {
  const router = useRouter()
  const { setPlantillas, hoy } = useCrm()
  useBreadcrumb([{ label: plantilla.nombre }])
  const [borrador, setBorrador] = React.useState<Borrador>({ nombre: plantilla.nombre, uso: plantilla.uso, canal: plantilla.canal, asunto: plantilla.asunto ?? "", cuerpo: plantilla.cuerpo })
  const [saliendo, setSaliendo] = React.useState(false)
  const [borrando, setBorrando] = React.useState(false)
  const asuntoRef = React.useRef<HTMLInputElement>(null)
  const cuerpoRef = React.useRef<HTMLTextAreaElement>(null)
  const ultimo = React.useRef<"asunto" | "cuerpo">("cuerpo")

  const cambiado = borrador.nombre !== plantilla.nombre || borrador.uso !== plantilla.uso || borrador.canal !== plantilla.canal || borrador.asunto !== (plantilla.asunto ?? "") || borrador.cuerpo !== plantilla.cuerpo
  const esEmail = borrador.canal === "email"
  const palabras = borrador.cuerpo.trim() ? borrador.cuerpo.trim().split(/\s+/).length : 0
  const usadas = variablesDe(`${esEmail ? borrador.asunto : ""}\n${borrador.cuerpo}`)

  const guardar = () => {
    setPlantillas((ps) => ps.map((p) => (p.id === plantilla.id ? { ...p, ...borrador, nombre: borrador.nombre.trim() || "Plantilla sin nombre", asunto: esEmail ? borrador.asunto : undefined, actualizadaEl: hoy } : p)))
    toast.success("Plantilla guardada")
  }

  // ⌘+Enter guarda desde cualquier campo.
  const atajo = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && cambiado) {
      e.preventDefault()
      guardar()
    }
  }

  /** Mete la variable donde estaba el cursor del último campo tocado. */
  const insertar = (clave: string) => {
    const campo = ultimo.current === "asunto" && esEmail ? asuntoRef.current : cuerpoRef.current
    const nombre = ultimo.current === "asunto" && esEmail ? "asunto" : "cuerpo"
    const texto = `{{${clave}}}`
    const actual = borrador[nombre] ?? ""
    const desde = campo?.selectionStart ?? actual.length
    const hasta = campo?.selectionEnd ?? actual.length
    setBorrador((b) => ({ ...b, [nombre]: actual.slice(0, desde) + texto + actual.slice(hasta) }))
    requestAnimationFrame(() => {
      campo?.focus()
      campo?.setSelectionRange(desde + texto.length, desde + texto.length)
    })
  }

  const volver = () => (cambiado ? setSaliendo(true) : router.push("/workspace/crm/plantillas"))
  const duplicar = () => {
    const copia: Plantilla = { ...plantilla, ...borrador, id: idNuevo("pl"), nombre: `${borrador.nombre} (copia)`, favorita: false, usos: 0, ultimoUso: undefined, creadaEl: hoy, actualizadaEl: hoy }
    setPlantillas((ps) => [copia, ...ps])
    router.push(`/workspace/crm/plantillas/${copia.id}`)
    toast.success("Plantilla duplicada")
  }

  return (
    <PageBody className="px-4 pb-28 md:px-[34px] md:pb-10" onKeyDown={atajo}>
      <PageHeader
        title={
          <span className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon-sm" aria-label="Volver a las plantillas" onClick={volver}><ArrowLeftIcon /></Button>
            <span className="truncate">{borrador.nombre || "Plantilla sin nombre"}</span>
            {plantilla.favorita && <StarIcon className="size-5 flex-none fill-current text-warning" aria-label="Favorita" />}
          </span>
        }
        description={`${USOS_PLANTILLA[borrador.uso]} · ${CANALES_PLANTILLA[borrador.canal]} · usada ${plantilla.usos} ${plantilla.usos === 1 ? "vez" : "veces"}${cambiado ? " · cambios sin guardar" : ""}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setPlantillas((ps) => ps.map((p) => (p.id === plantilla.id ? { ...p, favorita: !p.favorita } : p)))}>
              <StarIcon className={cn(plantilla.favorita && "fill-current text-warning")} /> {plantilla.favorita ? "Favorita" : "Marcar favorita"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Más acciones"><EllipsisIcon /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={duplicar}><CopyPlusIcon /> Duplicar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setBorrando(true)}><Trash2Icon /> Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={guardar} disabled={!cambiado}><SaveIcon /> Guardar cambios</Button>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Section>
          <SectionHeader icon={FileTextIcon} title="Editor" meta={`${palabras} palabras`} action={<VariableMenu onElegir={insertar} />} />
          <SectionBody className="grid content-start gap-4 p-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px_160px]">
              <Field>
                <FieldLabel htmlFor="pe-nombre">Nombre</FieldLabel>
                <Input id="pe-nombre" value={borrador.nombre} onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pe-uso">Para qué</FieldLabel>
                <Select value={borrador.uso} onValueChange={(v) => setBorrador((b) => ({ ...b, uso: v as UsoPlantilla }))}>
                  <SelectTrigger id="pe-uso" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(USOS_PLANTILLA) as UsoPlantilla[]).map((u) => <SelectItem key={u} value={u}>{USOS_PLANTILLA[u]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="pe-canal">Canal</FieldLabel>
                <Select value={borrador.canal} onValueChange={(v) => setBorrador((b) => ({ ...b, canal: v as CanalPlantilla }))}>
                  <SelectTrigger id="pe-canal" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CANALES_PLANTILLA) as CanalPlantilla[]).map((c) => <SelectItem key={c} value={c}>{CANALES_PLANTILLA[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {esEmail && (
              <Field>
                <FieldLabel htmlFor="pe-asunto">Asunto</FieldLabel>
                <Input id="pe-asunto" ref={asuntoRef} value={borrador.asunto} onFocus={() => (ultimo.current = "asunto")} onChange={(e) => setBorrador((b) => ({ ...b, asunto: e.target.value }))} placeholder="Propuesta para {{propuesta.campana}}" />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="pe-cuerpo">{esEmail ? "Email" : "Mensaje"}</FieldLabel>
              <Textarea id="pe-cuerpo" ref={cuerpoRef} rows={18} value={borrador.cuerpo} onFocus={() => (ultimo.current = "cuerpo")} onChange={(e) => setBorrador((b) => ({ ...b, cuerpo: e.target.value }))} className="min-h-[360px] font-mono text-[13px] leading-relaxed" />
            </Field>
          </SectionBody>
          <SectionFooter>
            <span>{usadas.length ? `Variables: ${usadas.map(etiquetaVariable).join(", ")}` : "Sin variables: pulsa «Variable» para meter el nombre de la marca, de la persona o el total."}</span>
            <span className="flex-none">⌘ + Enter guarda</span>
          </SectionFooter>
        </Section>

        <VistaPrevia borrador={borrador} />
      </div>

      <ConfirmDialog
        open={saliendo}
        onOpenChange={setSaliendo}
        title="¿Descartar los cambios?"
        description="Has cambiado la plantilla y no la has guardado."
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        destructive
        onConfirm={() => router.push("/workspace/crm/plantillas")}
      />
      <ConfirmDialog
        open={borrando}
        onOpenChange={setBorrando}
        title={`¿Eliminar «${plantilla.nombre}»?`}
        description="Deja de salir al escribir a las marcas. Lo que ya mandaste no cambia."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          setPlantillas((ps) => ps.filter((p) => p.id !== plantilla.id))
          router.push("/workspace/crm/plantillas")
          toast.success("Plantilla eliminada")
        }}
      />
    </PageBody>
  )
}

function VariableMenu({ onElegir }: { onElegir: (clave: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm"><BracesIcon /> Variable</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[420px] w-64 overflow-y-auto">
        {GRUPOS_VARIABLE.map((g, i) => (
          <DropdownMenuGroup key={g}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{g}</DropdownMenuLabel>
            {VARIABLES.filter((v) => v.grupo === g).map((v) => (
              <DropdownMenuItem key={v.clave} onSelect={() => onElegir(v.clave)}>
                {v.label}
                <code className="ml-auto font-mono text-[10px] text-muted-foreground">{v.clave}</code>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Cómo le llega a una marca concreta: se elige la marca, la persona y la propuesta. */
function VistaPrevia({ borrador }: { borrador: Borrador }) {
  const { marcas, contactos, propuestas, perfil } = useCrm()
  const origen = useOrigen()
  const conPresupuesto = propuestas.find((p) => p.presupuesto)
  const [marcaId, setMarcaId] = React.useState(conPresupuesto?.marcaId ?? marcas[0]?.id ?? "")
  const deLaMarca = contactos.filter((c) => c.marcaId === marcaId)
  const suyas = propuestas.filter((p) => p.marcaId === marcaId)
  const [contactoId, setContactoId] = React.useState<string>(NINGUNA)
  const [propuestaId, setPropuestaId] = React.useState<string>(NINGUNA)
  // Al cambiar de marca, la persona y la propuesta pasan a ser las suyas.
  const contacto = deLaMarca.find((c) => c.id === contactoId) ?? deLaMarca.find((c) => c.principal) ?? deLaMarca[0] ?? null
  const propuesta = suyas.find((p) => p.id === propuestaId) ?? suyas.find((p) => p.presupuesto) ?? suyas[0] ?? null
  const marca = marcas.find((m) => m.id === marcaId) ?? null

  const ctx = contextoPlantilla({ perfil, marca, contacto, propuesta, tarifas: perfil.tarifas, origen })
  const esEmail = borrador.canal === "email"
  const asunto = rellenar(borrador.asunto ?? "", ctx)
  const cuerpo = rellenar(borrador.cuerpo, ctx)
  const faltan = variablesSinValor(`${esEmail ? borrador.asunto : ""}\n${borrador.cuerpo}`, ctx)

  const pintar = (texto: string) =>
    trozos(texto).map((t, i) => (t.variable ? <mark key={i} className="rounded bg-warning-soft px-0.5 text-warning">{t.texto}</mark> : <React.Fragment key={i}>{t.texto}</React.Fragment>))

  return (
    <Section>
      <SectionHeader
        icon={EyeIcon}
        title="Vista previa"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(esEmail && asunto ? `${asunto}\n\n${cuerpo}` : cuerpo)
              toast.success("Copiado tal cual se ve")
            }}
          >
            <CopyIcon /> Copiar
          </Button>
        }
      />
      <SectionBody className="flex flex-col gap-3 p-4">
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <Select value={marcaId} onValueChange={(v) => { setMarcaId(v); setContactoId(NINGUNA); setPropuestaId(NINGUNA) }}>
            <SelectTrigger className="w-full" aria-label="Marca"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={contacto?.id ?? NINGUNA} onValueChange={setContactoId} disabled={deLaMarca.length === 0}>
            <SelectTrigger className="w-full" aria-label="Persona"><SelectValue placeholder="Sin persona" /></SelectTrigger>
            <SelectContent>
              {deLaMarca.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              {deLaMarca.length === 0 && <SelectItem value={NINGUNA}>Sin persona</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={propuesta?.id ?? NINGUNA} onValueChange={setPropuestaId} disabled={suyas.length === 0}>
            <SelectTrigger className="w-full" aria-label="Propuesta"><SelectValue placeholder="Sin propuesta" /></SelectTrigger>
            <SelectContent>
              {suyas.map((p) => <SelectItem key={p.id} value={p.id}>{p.campana}</SelectItem>)}
              {suyas.length === 0 && <SelectItem value={NINGUNA}>Sin propuesta</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border">
          {esEmail ? (
            <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 border-b bg-muted/40 px-3 py-2.5 text-xs">
              <dt className="text-muted-foreground">De</dt>
              <dd className="truncate">{perfil.nombre} &lt;{perfil.email}&gt;</dd>
              <dt className="text-muted-foreground">Para</dt>
              <dd className="truncate">{contacto ? `${contacto.nombre}${contacto.email ? ` <${contacto.email}>` : " (sin email)"}` : "—"}</dd>
              <dt className="text-muted-foreground">Asunto</dt>
              <dd className="font-semibold">{asunto ? pintar(asunto) : <span className="font-normal text-muted-foreground">Sin asunto</span>}</dd>
            </dl>
          ) : (
            <p className="border-b bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">{CANALES_PLANTILLA[borrador.canal]} a {contacto?.nombre ?? marca?.nombre ?? "—"}</p>
          )}
          <div className="px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap">{pintar(cuerpo)}</div>
        </div>
        {faltan.length > 0 && (
          <p className="text-xs text-warning">
            En amarillo, lo que no tiene valor con esta marca: {faltan.map(etiquetaVariable).join(", ")}.
          </p>
        )}
      </SectionBody>
    </Section>
  )
}
