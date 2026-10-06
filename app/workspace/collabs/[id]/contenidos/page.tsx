import { ListaContenidos } from "./lista-contenidos"

/** La lista de contenidos de la collab; los datos los pone el layout de la collab. */
export default async function CollabContenidosPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { nueva } = await searchParams
  return <ListaContenidos nuevaInicial={nueva === "1"} />
}
