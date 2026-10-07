import { formatReportTime, type Report } from './report'

const MARGIN = 14 // mm
const DISCLAIMER =
  'Made with ARK Tracker. Independent fan content, not affiliated with, endorsed, or sponsored by Studio Wildcard.'

// Builds the report as an A4 PDF and downloads it. The PDF library is a few hundred KB,
// so it's only loaded when someone actually exports.
export async function downloadReportPdf(report: Report, filename: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2

  // Header
  doc.setFontSize(16)
  doc.setTextColor(20)
  doc.text('ARK Tracker report', MARGIN, 18)
  doc.setFontSize(9)
  doc.setTextColor(90)
  const headerLines = [
    `Generated ${formatReportTime(report.generatedAt, report.offset)}`,
    `All times are ${report.offset} (${report.timeZone}), the time zone of the device that exported this.`,
    ...doc.splitTextToSize(`Filters: ${report.filters}`, contentWidth),
  ]
  doc.text(headerLines, MARGIN, 24)
  let y = 24 + headerLines.length * 4.5 + 6

  if (report.sections.length === 0) {
    doc.setFontSize(11)
    doc.text('No markers match these filters.', MARGIN, y)
  }

  for (const section of report.sections) {
    // Keep a map heading from being stranded at the bottom of a page
    if (y > pageHeight - 40) {
      doc.addPage()
      y = 18
    }
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text(section.mapName, MARGIN, y)

    autoTable(doc, {
      startY: y + 2,
      // Top margin leaves room for the "(continued)" heading on later pages
      margin: { left: MARGIN, right: MARGIN, top: 22, bottom: 18 },
      // pageNumber counts this table's pages, so anything after 1 is a continuation
      didDrawPage: ({ pageNumber }) => {
        if (pageNumber === 1) return
        doc.setFontSize(12)
        doc.setTextColor(20)
        doc.text(`${section.mapName} (continued)`, MARGIN, 18)
      },
      head: [['Marker', 'Location', 'Timers (ready at)', 'Description']],
      body: section.markers.map(({ marker, categoryName, timers }) => [
        `${marker.name}\n${categoryName}${marker.status === 'done' ? ' (done)' : ''}`,
        `${marker.lat}, ${marker.lon}`,
        timers
          .map(t => {
            const name = t.group ? `${t.group} ${t.label}` : t.label
            const when = formatReportTime(t.readyAt, report.offset)
            const ready = t.status === 'active' && t.readyAt <= report.generatedAt
            return `${name}: ${ready ? `ready since ${when}` : when}${t.status === 'done' ? ' (done)' : ''}`
          })
          .join('\n'),
        marker.description,
      ]),
      styles: { fontSize: 8, cellPadding: 1.5, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: [42, 48, 56], textColor: 255 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20 }, 2: { cellWidth: 72 } },
      // Don't split one marker's row across two pages
      rowPageBreak: 'avoid',
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // Footer on every page, now that the page count is known
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text(DISCLAIMER, MARGIN, pageHeight - 8)
    doc.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - 8, { align: 'right' })
  }

  doc.save(filename)
}
