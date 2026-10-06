"use client"

import Link from "next/link"
import { BookOpenIcon } from "lucide-react"
import { AppShell } from "@/components/app/app-shell"
import { Button } from "@/components/ui/button"
import { DemoReportButton } from "@/components/docs/examples/report-demo"
import { MobileTabBar } from "@/components/influencer/mobile-tab-bar"
import { ThemeBody } from "@/components/influencer/theme-body"
import { workspaceBrand, workspaceNav, workspaceTabs, workspaceUser } from "./nav"

/** Shell del workspace: la sidebar y la cabecera heredadas, el tema hijo y la barra inferior del móvil. */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-influencer contents">
      <ThemeBody />
      <AppShell
        brand={workspaceBrand}
        user={workspaceUser}
        nav={workspaceNav}
        report={<DemoReportButton />}
        headerEnd={
          <Button variant="outline" size="sm" asChild className="ml-1 hidden lg:inline-flex">
            <Link href="/ds/influencer">
              <BookOpenIcon /> Design system
            </Link>
          </Button>
        }
      >
        {children}
      </AppShell>
      <MobileTabBar tabs={workspaceTabs} />
    </div>
  )
}
