"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRightIcon, CheckIcon, FilePenLineIcon, FilePlus2Icon, SendIcon, ShieldCheckIcon, XIcon } from "lucide-react"
import { cn } from "cn"
import type { Pieza, PlantillaGuion, Version } from "@/lib/influencer/modelo"
import { nombreDeParte, partesDePieza, ultimaVersion } from "@/lib/influencer/collabs"
import { compararTextos, comprobarGuion, duracionEstimada, textoPlano, type Comprobacion } from "@/lib/influencer/guion"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { EditorTexto } from "@/components/influencer/editor-texto"
import { Conversacion, segundos } from "@/components/influencer/conversacion"
import { CompartirEnlaceDialog } from "@/components/influencer/compartir-enlace"
import { BotonPanel, EnlaceRevisionBoton, VersionesTabs, situacionDe } from "./barra-versiones"
import { PlantillasMenu } from "@/components/influencer/plantillas-menu"
import type { AccionesPieza } from "./use-pieza"

/** Lo que cambia de una versión a la siguiente, palabra a palabra. */
function Comparacion({ antes, despues }: { antes: string; despues: string }) {
  const tramos = compararTextos(textoPlano(antes), textoPlano(despues))
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <p className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-sm bg-success-soft px-1 text-success">añadido</span>
        <span className="rounded-sm bg-danger-soft px-1 text-danger line-through">quitado</span>
      </p>
      <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
        {tramos.map((t, i) =>
          t.tipo === "igual" ? (
            <span key={i}>{t.texto}</span>
          ) : t.tipo === "nuevo" ? (
            <ins key={i} className="rounded-sm bg-success-soft text-success no-underline">
              {t.texto}
            </ins>
          ) : (
            <del key={i} className="rounded-sm bg-danger-soft text-danger">
              {t.texto}
            </del>
          ),
        )}
      </div>
    </div>
  )
}

/** Lo que pide el brief y tiene que estar en el texto antes de mandarlo. */
function ComprobacionBrief({ lista }: { lista: Comprobacion[] }) {
  const bien = lista.filter((c) => c.ok).length
  return (
    <section className="rounded-2xl bg-card p-4 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheckIcon className="size-4 text-muted-foreground" /> Antes de enviar
        <span className={cn("ml-auto text-xs font-medium tabular-nums", bien === lista.length ? "text-success" : "text-warning")}>
          {bien} de {lista.length}
        </span>
      </h3>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {lista.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            {c.ok ? <CheckIcon className="mt-0.5 size-4 flex-none text-success" /> : <XIcon className="mt-0.5 size-4 flex-none text-warning" />}
            <span className={cn(c.ok && "text-muted-foreground")}>
              {c.label}
              {c.detalle && <span className="block text-xs text-warning">{c.detalle}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-xs text-muted-foreground">Sale del brief: menciones, hashtags, código y marca de publicidad.</p>
    </section>
  )
}

function Vacio({ pieza, plantillas, onEmpezar }: { pieza: Pieza; plantillas: PlantillaGuion[]; onEmpezar: (html: string) => void }) {
  const nombre = nombreDeParte(pieza, "guion").toLowerCase()
  return (
    <div className="grid flex-1 place-items-center p-8">
      <div className="w-full max-w-2xl text-center">
        <FilePenLineIcon className="mx-auto size-8 text-muted-foreground" />
        <h3 className="mt-3 text-base font-semibold">Escribe el {nombre}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Empieza en blanco o desde una plantilla. Cuando esté, envíalo a revisión: la marca lo comenta sobre el texto y lo aprueba.</p>
        <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
          <button type="button" onClick={() => onEmpezar("")} className="rounded-xl border border-dashed p-3 transition-colors hover:border-brand hover:bg-brand-soft">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FilePlus2Icon className="size-4" /> En blanco
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Un documento vacío</span>
          </button>
          {plantillas.map((p) => (
            <button key={p.id} type="button" onClick={() => onEmpezar(p.texto)} className="rounded-xl border p-3 transition-colors hover:border-brand hover:bg-brand-soft">
              <span className="text-sm font-medium">{p.nombre}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{p.descripcion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * El guion (o el texto) de una pieza: un editor grande con sus versiones, comparar con la anterior,
 * plantillas, la comprobación contra el brief y, a la derecha, la conversación con la marca, que se
 * oculta para escribir a pantalla completa.
 */
export function GuionParte({ acciones, plantillas: iniciales }: { acciones: AccionesPieza & { pieza: Pieza }; plantillas: PlantillaGuion[] }) {
  const { pieza, collab, hoy, crearVersion, cambiarVersion, enviarARevision, resolverNota, responderNota, escribir } = acciones
  const [versionId, setVersionId] = React.useState<string | null>(null)
  const [comparar, setComparar] = React.useState(false)
  const [panel, setPanel] = React.useState(true)
  const [nota, setNota] = React.useState<string | null>(null)
  const [plantillas, setPlantillas] = React.useState(iniciales)
  const [revisar, setRevisar] = React.useState<Comprobacion[] | null>(null)
  const [enviada, setEnviada] = React.useState<Version | null>(null)
  const versiones = pieza.guion
  const ultima = ultimaVersion(versiones)
  const version = versiones.find((v) => v.id === versionId) ?? ultima
  const anterior = version ? (versiones.find((v) => v.numero === version.numero - 1) ?? null) : null
  const editable = version?.estado === "borrador"
  const comprobaciones = version ? comprobarGuion(version.texto ?? "", collab.brief) : []
  const nombre = nombreDeParte(pieza, "guion")
  const marcas = version ? version.notas.flatMap((n, i) => (n.ancla?.tipo === "texto" ? [{ id: n.id, numero: i + 1, cita: n.ancla.cita, resuelta: n.resuelta }] : [])) : []

  const crear = (texto: string) => {
    const v = crearVersion("guion", { texto })
    if (v) setVersionId(v.id)
    return v
  }

  const enviar = () => {
    if (!version) return
    const v = enviarARevision("guion", version)
    if (v) setEnviada(v)
  }

  const accionPrincipal = () => {
    if (!version || version.id !== ultima?.id) return null
    if (version.estado === "borrador")
      return (
        <Button size="sm" disabled={!textoPlano(version.texto ?? "")} onClick={() => (comprobaciones.some((c) => !c.ok) ? setRevisar(comprobaciones.filter((c) => !c.ok)) : enviar())}>
          <SendIcon /> Enviar a revisión
        </Button>
      )
    if (version.estado === "cambios")
      return (
        <Button
          size="sm"
          onClick={() => {
            const v = crear(version.texto ?? "")
            if (v) toast.success(`v${v.numero} creada como borrador con el texto de la v${version.numero}`)
          }}
        >
          <FilePlus2Icon /> Crear la v{version.numero + 1}
        </Button>
      )
    if (version.estado === "aprobada" && partesDePieza(pieza).includes("media"))
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href={`?parte=media`}>
            Ir al {nombreDeParte(pieza, "media").toLowerCase()} <ArrowRightIcon />
          </Link>
        </Button>
      )
    return null
  }

  return (
    <div className={cn("grid gap-4", panel && "xl:grid-cols-[minmax(0,1fr)_360px]")}>
      <section className="flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <VersionesTabs versiones={versiones} activa={version?.id ?? null} onElegir={(id) => { setVersionId(id); setNota(null) }} />
          {anterior && (
            <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm">
              <Switch checked={comparar} onCheckedChange={setComparar} aria-label={`Comparar con la v${anterior.numero}`} /> Comparar con la v{anterior.numero}
            </label>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {version && <PlantillasMenu que="guion" plantillas={plantillas} onGuardar={(p) => setPlantillas((ps) => [...ps, p])} texto={version.texto ?? ""} disabled={!editable} onAplicar={(html) => cambiarVersion("guion", version.id, (v) => ({ ...v, texto: html }))} />}
            {version && <EnlaceRevisionBoton version={version} pieza={pieza} contacto={collab.brief.contacto} />}
            {accionPrincipal()}
            <BotonPanel abierto={panel} onCambiar={() => setPanel((p) => !p)} pendientes={version?.notas.filter((n) => !n.resuelta).length ?? 0} />
          </div>
        </div>

        {!version ? (
          <Vacio pieza={pieza} plantillas={plantillas} onEmpezar={crear} />
        ) : comparar && anterior ? (
          <Comparacion antes={anterior.texto ?? ""} despues={version.texto ?? ""} />
        ) : (
          <EditorTexto
            key={version.id}
            value={version.texto ?? ""}
            onChange={editable ? (html) => cambiarVersion("guion", version.id, (v) => ({ ...v, texto: html })) : undefined}
            editable={editable}
            placeholder={`Escribe el ${nombre.toLowerCase()}…`}
            notas={marcas}
            notaSeleccionada={nota}
            onSeleccionarNota={(id) => {
              setNota(id)
              setPanel(true)
            }}
            className="flex-1"
            contenidoClassName="min-h-[460px] px-8 py-6"
            pie={({ palabras }) => (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
                <span>{situacionDe(version, collab.brief.contacto.nombre, hoy)}</span>
                <span className="ml-auto tabular-nums">
                  {palabras} palabras · ≈ {segundos(duracionEstimada(palabras))} dicho a cámara{editable && " · se guarda solo"}
                </span>
              </div>
            )}
          />
        )}
      </section>

      {panel && (
        <aside className="flex min-w-0 flex-col gap-4">
          {version && comprobaciones.length > 0 && <ComprobacionBrief lista={comprobaciones} />}
          <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
            {version ? (
              <Conversacion
                notas={version.notas}
                mensajes={version.mensajes}
                lado="influencer"
                seleccionada={nota}
                onSeleccionar={setNota}
                onResolver={(id) => resolverNota("guion", version.id, id)}
                onResponder={(id, texto) => responderNota("guion", version.id, id, texto)}
                onEnviar={(texto) => escribir("guion", version.id, texto)}
                placeholder={`Escribe a ${collab.brief.contacto.nombre.split(" ")[0] || "la marca"}…`}
                className="flex-1"
              />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Las notas de la marca aparecen aquí, cada una en su sitio del texto.</p>
            )}
          </section>
        </aside>
      )}

      <ConfirmDialog
        open={revisar !== null}
        onOpenChange={(o) => !o && setRevisar(null)}
        title="Falta algo del brief"
        description={`${revisar?.map((c) => c.label.toLowerCase()).join(", ")}. ¿Lo envías igualmente?`}
        confirmLabel="Enviar igualmente"
        onConfirm={enviar}
      />
      {enviada?.enlace && (
        <CompartirEnlaceDialog
          open
          onOpenChange={(o) => !o && setEnviada(null)}
          titulo={`${nombre} v${enviada.numero} enviado a revisión`}
          descripcion={`Mándale el enlace a ${collab.brief.contacto.nombre || "la marca"}: lo lee, comenta sobre el texto y aprueba sin cuenta. Esta versión ya no se edita; si pide cambios, se hace la v${enviada.numero + 1}.`}
          ruta={`/revisar/${enviada.enlace.token}`}
          mensaje={`Hola ${collab.brief.contacto.nombre.split(" ")[0] || ""}, aquí tienes el ${nombre.toLowerCase()} de «${pieza.titulo}» para revisar:`}
          asunto={`${pieza.titulo} · ${nombre.toLowerCase()} v${enviada.numero} para revisar`}
          email={collab.brief.contacto.email}
        />
      )}
    </div>
  )
}
