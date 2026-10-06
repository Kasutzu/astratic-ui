"use client"

import * as React from "react"

/**
 * El registro abierto en la ficha, sincronizado con `?registro=id` para que se pueda recargar o
 * compartir el enlace. Abrir quita también `?nueva=` (el diálogo ya se usó).
 */
export function useRegistroAbierto(inicial: string | null) {
  const [id, setId] = React.useState<string | null>(inicial)
  const abrir = React.useCallback((nuevo: string | null) => {
    setId(nuevo)
    const url = new URL(window.location.href)
    if (nuevo) url.searchParams.set("registro", nuevo)
    else url.searchParams.delete("registro")
    url.searchParams.delete("nueva")
    window.history.replaceState(null, "", url)
  }, [])
  return [id, abrir] as const
}
