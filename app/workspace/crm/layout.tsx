import {
  hoy,
  listarCollabs,
  listarContactos,
  listarInteracciones,
  listarMarcas,
  listarPlantillas,
  listarPropuestas,
  listarTareas,
  marcasTrabajadas,
  obtenerMediaKit,
  obtenerPerfil,
} from "@/lib/influencer/consultas"
import { CrmProvider } from "./crm-provider"

/** Todas las pestañas del CRM comparten los mismos datos (ver `CrmProvider`). */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmProvider
      inicial={{
        hoy: hoy(),
        perfil: obtenerPerfil(),
        marcas: listarMarcas(),
        contactos: listarContactos(),
        propuestas: listarPropuestas(),
        interacciones: listarInteracciones(),
        plantillas: listarPlantillas(),
        mediaKit: obtenerMediaKit(),
        tareas: listarTareas(),
        collabs: listarCollabs(),
        marcasTrabajadas: marcasTrabajadas(),
      }}
    >
      {children}
    </CrmProvider>
  )
}
