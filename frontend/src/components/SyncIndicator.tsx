import CloudOffIcon from '@mui/icons-material/CloudOff'
import SyncIcon from '@mui/icons-material/Sync'
import { Badge, IconButton, Tooltip } from '@mui/material'
import React, { useEffect, useState } from 'react'

interface Props {
  pendingCount: number
}

export default function SyncIndicator({ pendingCount }: Props) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  if (!isOnline) {
    return (
      <Tooltip title="Sem conexão — dados salvos offline">
        <IconButton color="inherit" size="small">
          <CloudOffIcon />
        </IconButton>
      </Tooltip>
    )
  }

  if (pendingCount > 0) {
    return (
      <Tooltip title={`${pendingCount} item(s) pendente(s) de sincronização`}>
        <IconButton color="inherit" size="small">
          <Badge badgeContent={pendingCount} color="warning">
            <SyncIcon />
          </Badge>
        </IconButton>
      </Tooltip>
    )
  }

  return null
}
