import { WorkspaceShell } from "./shell"

export const metadata = { title: { default: "Workspace", template: "%s · Influencer Workspace · Astratic UI" } }

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>
}
