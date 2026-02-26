'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface CsvImportPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

export function CsvImportPanel({ open, onOpenChange, onImported }: CsvImportPanelProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  async function handleUpload() {
    if (!file) {
      toast({ title: 'No file selected', description: 'Please choose a CSV file.', variant: 'destructive' })
      return
    }

    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/menu/import', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Import failed.')
      }

      const importResult = {
        imported: Number(payload.imported ?? 0),
        errors: Array.isArray(payload.errors) ? payload.errors as string[] : [],
      }

      setResult(importResult)
      toast({
        title: 'CSV import completed',
        description: `${importResult.imported} item(s) imported.`,
      })
      onImported()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import CSV.'
      toast({ title: 'Import failed', description: message, variant: 'destructive' })
      setResult({ imported: 0, errors: [message] })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Menu CSV</DialogTitle>
          <DialogDescription>Upload your menu CSV to create or update items.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={isUploading}
          />

          {result ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Imported: {result.imported}</p>
              {result.errors.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">
                  {result.errors.slice(0, 8).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">No validation errors.</p>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Close</Button>
          <Button type="button" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
