// Saves a file to the device's downloads
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// "ark-tracker-2026-10-07", in local time
export function exportBaseName(now: number): string {
  const d = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `ark-tracker-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
