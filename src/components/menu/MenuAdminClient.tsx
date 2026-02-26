'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileUp, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { CsvImportPanel } from '@/components/menu/CsvImportPanel'
import { MenuFormDialog } from '@/components/menu/MenuFormDialog'
import type { MenuAdminItem } from '@/components/menu/types'

interface MenuAdminClientProps {
  initialItems: MenuAdminItem[]
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function MenuAdminClient({ initialItems }: MenuAdminClientProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<MenuAdminItem[]>(initialItems)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'FOOD' | 'DRINK'>('FOOD')
  const [editingItem, setEditingItem] = useState<MenuAdminItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function fetchItems() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/menu', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to fetch menu items.')
      }
      setItems(Array.isArray(payload.data) ? payload.data as MenuAdminItem[] : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch menu items.'
      toast({ title: 'Failed to load menu', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchItems()
  }, [])

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items
      .filter((item) => item.menuType === activeTab)
      .filter((item) => !needle || item.name.toLowerCase().includes(needle))
  }, [items, activeTab, search])

  async function handleDelete(item: MenuAdminItem) {
    const confirmed = window.confirm(`Set ${item.name} to inactive?`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/menu/${item.id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete item.')
      }

      toast({ title: 'Item deactivated', description: item.name })
      await fetchItems()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed.'
      toast({ title: 'Delete failed', description: message, variant: 'destructive' })
    }
  }

  async function handleToggle(item: MenuAdminItem) {
    try {
      const response = await fetch(`/api/menu/${item.id}/toggle`, {
        method: 'PATCH',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to toggle active status.')
      }

      setItems((prev) => prev.map((entry) => (entry.id === item.id ? payload.data as MenuAdminItem : entry)))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle status.'
      toast({ title: 'Toggle failed', description: message, variant: 'destructive' })
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">Menu Management</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null)
                setIsDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search by name..."
              />
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'FOOD' | 'DRINK')}>
              <TabsList>
                <TabsTrigger value="FOOD">Food</TabsTrigger>
                <TabsTrigger value="DRINK">Drink</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Price (MMK)</TableHead>
                  <TableHead className="text-right">Cost (MMK)</TableHead>
                  <TableHead className="text-right">Cost %</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const costPct = item.salesPriceMmk > 0 ? (item.supplierCostMmk / item.salesPriceMmk) * 100 : 0
                  const marginPct = 100 - costPct

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.menuCode}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.section?.name ?? '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatMmk(item.salesPriceMmk)}</TableCell>
                      <TableCell className="text-right">{formatMmk(item.supplierCostMmk)}</TableCell>
                      <TableCell className="text-right">{costPct.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{marginPct.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Switch checked={item.isActive} onCheckedChange={() => void handleToggle(item)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(item)
                              setIsDialogOpen(true)
                            }}
                          >
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => void handleDelete(item)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {!filteredItems.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No menu items match this filter.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MenuFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        onSaved={() => void fetchItems()}
      />

      <CsvImportPanel open={isImportOpen} onOpenChange={setIsImportOpen} onImported={() => void fetchItems()} />
    </main>
  )
}
