"use client"

import { PageHeader } from "@/components/app/page-header"
import { PageTabs } from "@/components/app/page-tabs"
import { crmTabs } from "@/app/workspace/nav"

/** Cabecera común del CRM: el mismo título en todas sus pestañas, con su descripción y acciones. */
export function CrmHeader({ description, actions }: { description: React.ReactNode; actions?: React.ReactNode }) {
  return <PageHeader title="CRM" description={description} tabs={<PageTabs items={crmTabs} />} actions={actions} />
}
