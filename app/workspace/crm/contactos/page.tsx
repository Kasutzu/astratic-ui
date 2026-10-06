import type { Metadata } from "next"
import { ContactosView } from "./contactos-view"

export const metadata: Metadata = { title: "Contactos · CRM" }

export default async function ContactosPage({ searchParams }: { searchParams: Promise<{ registro?: string; nueva?: string }> }) {
  const { registro, nueva } = await searchParams
  return <ContactosView abiertaInicial={registro ?? null} nuevaInicial={nueva === "1"} />
}
