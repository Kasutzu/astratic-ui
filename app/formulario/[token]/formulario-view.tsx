"use client"

import * as React from "react"
import Image from "next/image"
import { CalendarIcon, CircleCheckIcon, SendIcon } from "lucide-react"
import { fmt } from "@/lib/format"
import type { Collab, FormularioMarca, Marca, Perfil } from "@/lib/influencer/modelo"
import { describirEntregables } from "@/lib/influencer/collabs"
import { tintClass } from "@/lib/influencer/tints"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/app/states"
import { PaginaMarca } from "@/components/influencer/pagina-marca"
import { useBorrador } from "@/components/influencer/navegador"
import { FormularioBriefMarca, Paso } from "./formulario-brief"
import { MaterialesMarca, SIN_MATERIALES, type MaterialesEnviados } from "./materiales-marca"

export type DatosFormulario = { registro: FormularioMarca; collab: Collab; marca: Marca }

/** La columna de la izquierda: de quién es, para qué y cómo funciona. */
function Contexto({ datos, perfil }: { datos: DatosFormulario; perfil: Perfil }) {
  const { registro, collab, marca } = datos
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
      <section className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className={`relative h-24 ${collab.coverUrl ? "" : tintClass[collab.tint]}`}>
          {collab.coverUrl && <Image src={collab.coverUrl} alt="" fill sizes="380px" className="object-cover" />}
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold tracking-wider text-brand uppercase">
            {marca.nombre} · {registro.alcance === "brief" ? "Brief" : "Materiales"}
          </p>
          <h1 className="mt-1 text-xl leading-tight font-semibold tracking-tight">{collab.campana}</h1>
          {collab.piezas.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{describirEntregables(collab)}</p>}
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <CalendarIcon className="size-4 flex-none text-muted-foreground" />
            Publicación del {fmt.date(collab.desde)} al {fmt.date(collab.hasta)}
          </p>
        </div>
      </section>
      {registro.mensaje && (
        <section className="flex gap-3 rounded-2xl bg-card p-4 shadow-card">
          <span className="relative size-9 flex-none overflow-hidden rounded-full bg-muted">
            <Image src={perfil.fotoUrl} alt="" fill sizes="36px" className="object-cover" />
          </span>
          <p className="text-sm">
            <span className="font-medium">{perfil.nombre}</span>
            <span className="mt-0.5 block text-muted-foreground">{registro.mensaje}</span>
          </p>
        </section>
      )}
      <p className="px-1 text-xs text-muted-foreground">Sin cuenta ni contraseñas. Lo que envíes le llega a {perfil.nombrePila} al momento. Enlace válido hasta el {fmt.date(registro.caduca)}.</p>
    </aside>
  )
}

function Enviado({ perfil, alcance }: { perfil: Perfil; alcance: FormularioMarca["alcance"] }) {
  return (
    <section className="grid place-items-center rounded-2xl bg-card px-6 py-16 text-center shadow-card">
      <CircleCheckIcon className="size-10 text-success" />
      <h2 className="mt-3 text-xl font-semibold">¡Enviado!</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {perfil.nombrePila} ya tiene {alcance === "brief" ? "la campaña, las piezas y los materiales" : "los materiales"} en la collab. Si cambia algo, vuelve a este mismo enlace.
      </p>
    </section>
  )
}

/** Solo los materiales: quién los manda, los archivos y enlaces, y una nota. */
function FormularioMateriales({ contacto, onEnviar }: { contacto: { nombre: string; email: string }; onEnviar: () => void }) {
  const [materiales, setMateriales] = React.useState<MaterialesEnviados>(SIN_MATERIALES)
  const [nombre, setNombre] = React.useState(contacto.nombre)
  const hay = materiales.archivos.length + materiales.enlaces.length > 0
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (hay && nombre.trim()) onEnviar()
      }}
      className="overflow-hidden rounded-2xl bg-card shadow-card"
    >
      <Paso numero={1} titulo="Los materiales" ayuda="Archivos o enlaces: lo que necesita para grabar.">
        <MaterialesMarca value={materiales} onChange={setMateriales} />
      </Paso>
      <Paso numero={2} titulo="Quién los manda">
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="fmm-nombre">Tu nombre</FieldLabel>
            <Input id="fmm-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="fmm-nota">Nota</FieldLabel>
            <Textarea id="fmm-nota" rows={2} placeholder="El logo bueno es el de fondo transparente." />
          </Field>
        </div>
      </Paso>
      <footer className="flex flex-wrap items-center justify-end gap-3 bg-muted/40 px-5 py-4 md:px-8">
        <Button type="submit" size="lg" disabled={!hay || !nombre.trim()}>
          <SendIcon /> Enviar los materiales
        </Button>
      </footer>
    </form>
  )
}

/**
 * El formulario que rellena la marca por enlace, sin cuenta. Lo que llega del servidor o, si se
 * acaba de crear en el workspace, lo guardado en el navegador (en el portal, siempre la base de datos).
 */
export function FormularioView({ token, inicial, perfil }: { token: string; inicial: DatosFormulario | null; perfil: Perfil }) {
  const datos = useBorrador<DatosFormulario | null>(`formulario:${token}`, inicial)
  const [enviado, setEnviado] = React.useState(false)
  if (!datos) return <main className="grid min-h-screen place-items-center p-6"><EmptyState title="Este enlace no existe o ha caducado" description="Pide uno nuevo a quien te lo mandó." /></main>
  const { registro, collab, marca } = datos

  return (
    <PaginaMarca seccion={registro.alcance === "brief" ? "Brief de la campaña" : "Materiales de la campaña"} marca={marca.nombre} perfil={perfil} pie={`Enlace privado para ${marca.nombre}, sin cuenta. Tus datos solo los ven ${perfil.nombrePila} y Astratic Network.`}>
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <Contexto datos={datos} perfil={perfil} />
        {enviado || registro.respondidoEl ? (
          <Enviado perfil={perfil} alcance={registro.alcance} />
        ) : registro.alcance === "brief" ? (
          <FormularioBriefMarca
            collab={collab}
            influencer={perfil.nombrePila}
            onEnviar={() => {
              // En el portal, una server action guarda en la collab lo enviado (`aplicarFormulario`) y avisa a la influencer.
              setEnviado(true)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        ) : (
          <FormularioMateriales contacto={collab.brief.contacto} onEnviar={() => setEnviado(true)} />
        )}
      </div>
    </PaginaMarca>
  )
}
