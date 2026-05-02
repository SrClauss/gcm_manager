import Dexie, { Table } from 'dexie'

export interface LocalOccurrence {
  id?: number
  localId: string
  synced: boolean
  syncError?: string
  payload: Record<string, unknown>
  createdAt: number
}

export interface LocalPatrolReport {
  id?: number
  localId: string
  synced: boolean
  syncError?: string
  payload: Record<string, unknown>
  createdAt: number
}

export interface LocalChecklist {
  id?: number
  localId: string
  synced: boolean
  syncError?: string
  payload: Record<string, unknown>
  createdAt: number
}

export interface SyncQueueItem {
  id?: number
  endpoint: string
  method: 'POST' | 'PATCH' | 'PUT'
  payload: Record<string, unknown>
  createdAt: number
  retries: number
}

class GCMDatabase extends Dexie {
  occurrences!: Table<LocalOccurrence>
  patrolReports!: Table<LocalPatrolReport>
  checklists!: Table<LocalChecklist>
  syncQueue!: Table<SyncQueueItem>

  constructor() {
    super('sig-gcm-db')
    this.version(1).stores({
      occurrences: '++id, localId, synced, createdAt',
      patrolReports: '++id, localId, synced, createdAt',
      checklists: '++id, localId, synced, createdAt',
      syncQueue: '++id, endpoint, createdAt, retries',
    })
  }
}

export const db = new GCMDatabase()

export async function enqueueSync(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'PUT',
  payload: Record<string, unknown>,
) {
  await db.syncQueue.add({
    endpoint,
    method,
    payload,
    createdAt: Date.now(),
    retries: 0,
  })
}

export async function processSyncQueue(token: string) {
  const items = await db.syncQueue.orderBy('createdAt').toArray()
  for (const item of items) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item.payload),
      })
      if (response.ok) {
        await db.syncQueue.delete(item.id!)
      } else {
        await db.syncQueue.update(item.id!, { retries: item.retries + 1 })
      }
    } catch {
      await db.syncQueue.update(item.id!, { retries: item.retries + 1 })
    }
  }
}
