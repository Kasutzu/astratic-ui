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
import { hoy, listarTareas, obtenerPerfil } from "@/lib/influencer/consultas"
import { tareasUrgentes } from "@/lib/influencer/tareas"

export const workspaceBrand: Brand = { name: "Astratic", tagline: "Influencer Workspace", monogram: "A" }
export const workspaceUser: CurrentUser = { name: obtenerPerfil().nombre, role: "Creadora · beauty" }

const urgentes = tareasUrgentes(listarTareas(), hoy())

/** Las cinco páginas principales van también en la barra inferior del móvil. */
export const workspaceTabs: MobileTab[] = [
  { id: "inicio", label: "Inicio", href: "/workspace", icon: HouseIcon },
  { id: "propuestas", label: "Propuestas", href: "/workspace/propuestas", icon: KanbanSquareIcon },
  { id: "collabs", label: "Collabs", href: "/workspace/collabs", icon: SparklesIcon },
  { id: "tareas", label: "Tareas", href: "/workspace/tareas", icon: ListTodoIcon, badge: urgentes },
  { id: "cobros", label: "Cobros", href: "/workspace/cobros", icon: ReceiptEuroIcon },
]

export const workspaceNav: NavGroup[] = [
  { items: workspaceTabs.map(({ id, label, href, icon, badge }) => ({ id, label, href, icon, badge })) },
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

/** Las partes de la ficha de una collab: una ruta por pestaña. */
export function collabTabs(id: string, counts?: { piezas?: number; tareas?: number }): PageTab[] {
  const base = `/workspace/collabs/${id}`
  return [
    { href: base, label: "Resumen" },
    { href: `${base}/brief`, label: "Brief" },
    { href: `${base}/contenidos`, label: "Contenidos", count: counts?.piezas },
    { href: `${base}/materiales`, label: "Materiales" },
    { href: `${base}/tareas`, label: "Tareas", count: counts?.tareas },
  ]
}
