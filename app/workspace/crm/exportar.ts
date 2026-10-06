// Exportar una lista del CRM a CSV (se abre en Excel o Google Sheets).

/** Una celda segura: entre comillas si lleva separador, comillas o saltos de línea. */
function celda(v: string | number | null | undefined) {
  const texto = v === null || v === undefined ? "" : String(v)
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Descarga las filas como CSV con punto y coma, que es lo que abre bien Excel en español. */
export function descargarCsv(nombre: string, cabecera: string[], filas: (string | number | null | undefined)[][]) {
  const texto = [cabecera, ...filas].map((f) => f.map(celda).join(";")).join("\n")
  // La marca BOM hace que Excel lea bien las tildes.
  const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
