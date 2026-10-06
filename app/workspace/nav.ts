import {
  BookOpenIcon,
  ClapperboardIcon,
  HouseIcon,
  KanbanSquareIcon,
  ReceiptEuroIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react"
import type { Brand, CurrentUser, NavGroup } from "@/lib/nav"
import type { MobileTab } from "@/components/influencer/mobile-tab-bar"
import { demoProfile, demoTasks } from "@/lib/influencer/demo-data"

export const workspaceBrand: Brand = { name: "Astratic", tagline: "Influencer Workspace", monogram: "A" }
export const workspaceUser: CurrentUser = { name: demoProfile.name, role: "Creadora · beauty" }

const tareasPendientes = demoTasks.filter((t) => !t.done && t.bucket !== "semana").length

/** Las cinco páginas principales van también en la barra inferior del móvil. */
export const workspaceTabs: MobileTab[] = [
  { id: "inicio", label: "Inicio", href: "/workspace", icon: HouseIcon },
  { id: "propuestas", label: "Propuestas", href: "/workspace/propuestas", icon: KanbanSquareIcon },
  { id: "collabs", label: "Collabs", href: "/workspace/collabs", icon: SparklesIcon, badge: tareasPendientes },
  { id: "contenidos", label: "Contenidos", href: "/workspace/contenidos", icon: ClapperboardIcon },
  { id: "cobros", label: "Cobros", href: "/workspace/cobros", icon: ReceiptEuroIcon },
]

export const workspaceNav: NavGroup[] = [
  { items: workspaceTabs.map(({ id, label, href, icon, badge }) => ({ id, label, href, icon, badge })) },
  {
    label: "Mi cuenta",
    items: [
      { id: "perfil", label: "Perfil y tarifas", href: "/workspace/perfil", icon: UserRoundIcon },
      { id: "biblia", label: "Biblia", href: "/workspace/biblia", icon: BookOpenIcon },
      { id: "ajustes", label: "Ajustes", href: "/workspace/ajustes", icon: SettingsIcon },
    ],
  },
]
