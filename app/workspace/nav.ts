import {
  BookOpenIcon,
  ClapperboardIcon,
  HouseIcon,
  KanbanSquareIcon,
  ListTodoIcon,
  ReceiptEuroIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react"
import type { Brand, CurrentUser, NavGroup, PageTab } from "@/lib/nav"
import type { MobileTab } from "@/components/influencer/mobile-tab-bar"
import { hoy, listarPropuestas, listarTareas, listarTarifas, obtenerPerfil } from "@/lib/influencer/consultas"
import { tareasUrgentes } from "@/lib/influencer/tareas"
import { cifrasPipeline } from "@/lib/influencer/crm"

export const workspaceBrand: Brand = { name: "Astratic", tagline: "Influencer Workspace", monogram: "A" }
export const workspaceUser: CurrentUser = { name: obtenerPerfil().nombre, role: "Creadora · beauty" }

const urgentes = tareasUrgentes(listarTareas(), hoy())
const pasosHoy = cifrasPipeline(listarPropuestas(), listarTarifas(), hoy()).pasosHoy

/** Las partes del CRM: una ruta por pestaña. El pipeline es su portada. */
export const crmTabs: PageTab[] = [
  { href: "/workspace/crm", label: "Pipeline", count: pasosHoy },
  { href: "/workspace/crm/marcas", label: "Marcas" },
  { href: "/workspace/crm/contactos", label: "Contactos" },
  { href: "/workspace/crm/plantillas", label: "Plantillas" },
  { href: "/workspace/crm/media-kit", label: "Media kit" },
]

/** Las cinco páginas principales van también en la barra inferior del móvil. */
export const workspaceTabs: MobileTab[] = [
  { id: "inicio", label: "Inicio", href: "/workspace", icon: HouseIcon },
  { id: "crm", label: "CRM", href: "/workspace/crm", icon: KanbanSquareIcon, badge: pasosHoy },
  { id: "collabs", label: "Collabs", href: "/workspace/collabs", icon: SparklesIcon },
  { id: "tareas", label: "Tareas", href: "/workspace/tareas", icon: ListTodoIcon, badge: urgentes },
  { id: "cobros", label: "Cobros", href: "/workspace/cobros", icon: ReceiptEuroIcon },
]

export const workspaceNav: NavGroup[] = [
  { items: workspaceTabs.map(({ id, label, href, icon, badge }) => ({ id, label, href, icon, badge, tabs: id === "crm" ? crmTabs : undefined })) },
  {
    label: "Mi cuenta",
    items: [
      { id: "contenidos", label: "Contenidos", href: "/workspace/contenidos", icon: ClapperboardIcon },
      { id: "perfil", label: "Perfil y tarifas", href: "/workspace/perfil", icon: UserRoundIcon },
      { id: "biblia", label: "Biblia", href: "/workspace/biblia", icon: BookOpenIcon },
      { id: "ajustes", label: "Ajustes", href: "/workspace/ajustes", icon: SettingsIcon },
    ],
  },
]

/**
 * Las partes de la ficha de una collab: una ruta por pestaña, bajo el brief compacto. El brief no es
 * pestaña (se abre entero desde arriba) y las tareas viven en el Resumen, en el cronograma.
 */
export function collabTabs(id: string, counts?: { piezas?: number; materiales?: number }): PageTab[] {
  const base = `/workspace/collabs/${id}`
  return [
    { href: base, label: "Resumen" },
    { href: `${base}/contenidos`, label: "Contenidos", count: counts?.piezas },
    { href: `${base}/materiales`, label: "Materiales", count: counts?.materiales },
    { href: `${base}/contrato`, label: "Contrato" },
    { href: `${base}/facturacion`, label: "Facturación" },
    { href: `${base}/resultados`, label: "Resultados" },
  ]
}
