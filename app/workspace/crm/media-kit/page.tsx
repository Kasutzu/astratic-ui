import type { Metadata } from "next"
import { MediaKitView } from "./media-kit-view"

export const metadata: Metadata = { title: "Media kit · CRM" }

export default function MediaKitPage() {
  return <MediaKitView />
}
