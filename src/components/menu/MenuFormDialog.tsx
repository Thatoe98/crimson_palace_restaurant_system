'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import type { MenuAdminItem, MenuPayload } from '@/components/menu/types'

interface MenuFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MenuAdminItem | null
  onSaved: () => void
}

function toPayload(item: MenuAdminItem | null): MenuPayload {
  if (!item) {
    return {
      name: '',
      menuType: 'FOOD',
      section: '',
      unitSold: 'portion',
      portionSize: '',
      salesPriceMmk: 0,
      supplierCostMmk: 0,
      targetCostPct: null,
      storageLocation: '',
      prepStation: '',
      leadTimeDays: null,
      notes: '',
      highValue: false,
      highTheftRisk: false,
      expiryTracking: false,
      isActive: true,
    }
  }

  return {
    name: item.name,
    menuType: item.menuType,
    section: item.section?.name ?? '',
    unitSold: item.unitSold,
    portionSize: item.portionSize ?? '',
    salesPriceMmk: item.salesPriceMmk,
    supplierCostMmk: item.supplierCostMmk,
    targetCostPct: item.targetCostPct,
    storageLocation: item.storageLocation?.name ?? '',
    prepStation: item.prepStation?.name ?? '',
    leadTimeDays: item.leadTimeDays,
    notes: item.notes ?? '',
    highValue: item.highValue,
    highTheftRisk: item.highTheftRisk,
    expiryTracking: item.expiryTracking,
    isActive: item.isActive,
  }
}

export function MenuFormDialog({ open, onOpenChange, item, onSaved }: MenuFormDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<MenuPayload>(() => toPayload(item))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dialogTitle = useMemo(() => (item ? 'Edit Menu Item' : 'Add Menu Item'), [item])

  useEffect(() => {
    setForm(toPayload(item))
    setError(null)
  }, [item, open])

  function updateField<Key extends keyof MenuPayload>(key: Key, value: MenuPayload[Key]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Item name is required.'
    if (!form.section.trim()) return 'Section is required.'
    if (!Number.isFinite(form.salesPriceMmk) || form.salesPriceMmk < 0) return 'Sales price must be a non-negative number.'
    if (!Number.isFinite(form.supplierCostMmk) || form.supplierCostMmk < 0) return 'Supplier cost must be a non-negative number.'
    if (form.targetCostPct != null && (form.targetCostPct < 0 || form.targetCostPct > 100)) {
      return 'Target cost % must be between 0 and 100.'
    }
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const endpoint = item ? `/api/menu/${item.id}` : '/api/menu'
      const method = item ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          section: form.section.trim(),
          unitSold: form.unitSold.trim() || 'portion',
          portionSize: form.portionSize.trim() || null,
          storageLocation: form.storageLocation.trim() || null,
          prepStation: form.prepStation.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save menu item.')
      }

      toast({
        title: item ? 'Menu item updated' : 'Menu item created',
        description: form.name,
      })

      onOpenChange(false)
      onSaved()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to save menu item.'
      setError(message)
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>Fill in the details below and save your menu item.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="name">Item Name</Label>
            <Input id="name" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Menu Type</Label>
              <Select value={form.menuType} onValueChange={(value: 'FOOD' | 'DRINK') => updateField('menuType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="DRINK">Drink</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="section">Section</Label>
              <Input id="section" value={form.section} onChange={(event) => updateField('section', event.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="unitSold">Unit Sold</Label>
              <Input id="unitSold" value={form.unitSold} onChange={(event) => updateField('unitSold', event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="portionSize">Portion Size</Label>
              <Input id="portionSize" value={form.portionSize} onChange={(event) => updateField('portionSize', event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="salesPriceMmk">Sales Price (MMK)</Label>
              <Input
                id="salesPriceMmk"
                type="number"
                min={0}
                value={form.salesPriceMmk}
                onChange={(event) => updateField('salesPriceMmk', Number(event.target.value))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplierCostMmk">Supplier Cost (MMK)</Label>
              <Input
                id="supplierCostMmk"
                type="number"
                min={0}
                value={form.supplierCostMmk}
                onChange={(event) => updateField('supplierCostMmk', Number(event.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="targetCostPct">Target Cost %</Label>
              <Input
                id="targetCostPct"
                type="number"
                min={0}
                max={100}
                value={form.targetCostPct ?? ''}
                onChange={(event) => {
                  const value = event.target.value.trim()
                  updateField('targetCostPct', value ? Number(value) : null)
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leadTimeDays">Lead Time Days</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min={0}
                value={form.leadTimeDays ?? ''}
                onChange={(event) => {
                  const value = event.target.value.trim()
                  updateField('leadTimeDays', value ? Number(value) : null)
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="storageLocation">Storage Location</Label>
              <Input id="storageLocation" value={form.storageLocation} onChange={(event) => updateField('storageLocation', event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prepStation">Prep Station</Label>
              <Input id="prepStation" value={form.prepStation} onChange={(event) => updateField('prepStation', event.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>High Value</span>
              <Switch checked={form.highValue} onCheckedChange={(checked) => updateField('highValue', checked)} />
            </label>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>High Theft Risk</span>
              <Switch checked={form.highTheftRisk} onCheckedChange={(checked) => updateField('highTheftRisk', checked)} />
            </label>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>Expiry Tracking</span>
              <Switch checked={form.expiryTracking} onCheckedChange={(checked) => updateField('expiryTracking', checked)} />
            </label>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>Is Active</span>
              <Switch checked={form.isActive} onCheckedChange={(checked) => updateField('isActive', checked)} />
            </label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
