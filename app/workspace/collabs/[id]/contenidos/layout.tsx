import { ContenidosMarco } from "./contenidos-marco"

export default function ContenidosLayout({ children }: { children: React.ReactNode }) {
  return <ContenidosMarco>{children}</ContenidosMarco>
}
