'use client'

import QRCode from 'qrcode'
import { Download, QrCode } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DiningTable {
  id: string
  label: string
  capacity: number
  qrSlug: string | null
}

interface QrPageClientProps {
  tables: DiningTable[]
  baseUrl: string
}

export function QrPageClient({ tables, baseUrl }: QrPageClientProps) {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement | null>>(new Map())

  useEffect(() => {
    tables.forEach((table) => {
      const canvas = canvasRefs.current.get(table.id)
      if (!canvas) return

      void QRCode.toCanvas(canvas, `${baseUrl}/order/${table.id}`, {
        width: 200,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
    })
  }, [tables, baseUrl])

  async function downloadPng(table: DiningTable) {
    const canvas = canvasRefs.current.get(table.id)
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `QR-${table.label}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function downloadAllPdf() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    tables.forEach((table, index) => {
      if (index > 0) doc.addPage()

      const canvas = canvasRefs.current.get(table.id)
      if (!canvas) return

      const imgData = canvas.toDataURL('image/png')

      const pageW = 210
      const qrSize = 100
      const x = (pageW - qrSize) / 2
      const y = 60

      doc.setFontSize(24)
      doc.setTextColor(15, 23, 42)
      doc.text(table.label, pageW / 2, 40, { align: 'center' })

      doc.setFontSize(12)
      doc.setTextColor(100, 116, 139)
      doc.text(`Capacity: ${table.capacity}`, pageW / 2, 52, { align: 'center' })

      doc.addImage(imgData, 'PNG', x, y, qrSize, qrSize)

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text(`${baseUrl}/order/${table.id}`, pageW / 2, y + qrSize + 12, { align: 'center' })

      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text('Scan to Order', pageW / 2, y + qrSize + 24, { align: 'center' })
    })

    doc.save('Crimson-Palace-QR-Codes.pdf')
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">QR Code Generator</h1>
          </div>

          <Button variant="default" onClick={() => void downloadAllPdf()} disabled={!tables.length}>
            <Download className="mr-2 h-4 w-4" />
            Download All PDF
          </Button>
        </div>

        {!tables.length ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No active tables found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <Card key={table.id}>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl font-bold">{table.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">Capacity: {table.capacity}</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <canvas
                    ref={(el) => {
                      canvasRefs.current.set(table.id, el)
                    }}
                    className="rounded-md"
                  />
                  <Button variant="outline" size="sm" onClick={() => void downloadPng(table)}>
                    <Download className="mr-2 h-4 w-4" />
                    Save PNG
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
