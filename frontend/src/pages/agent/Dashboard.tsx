import AssignmentIcon from '@mui/icons-material/Assignment'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import ReportIcon from '@mui/icons-material/Report'
import SyncIcon from '@mui/icons-material/Sync'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import {
  AppBar,
  Badge,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import { useLiveQuery } from 'dexie-react-hooks'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import SyncIndicator from '../../components/SyncIndicator'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../db/localDatabase'

interface ActionCard {
  label: string
  icon: React.ReactNode
  path: string
  color: string
  adminOnly?: boolean
}

const ACTIONS: ActionCard[] = [
  { label: 'Novo Talão\nde Ocorrência', icon: <ReportIcon sx={{ fontSize: 40 }} />, path: '/agent/occurrence/new', color: '#1565C0' },
  { label: 'Relatório\nde Serviço', icon: <AssignmentIcon sx={{ fontSize: 40 }} />, path: '/agent/patrol-report', color: '#2E7D32' },
  { label: 'Checklist\nde Viatura', icon: <DirectionsCarIcon sx={{ fontSize: 40 }} />, path: '/agent/vehicle-checklist', color: '#E65100' },
  { label: 'Painel\nAdministrativo', icon: <AdminPanelSettingsIcon sx={{ fontSize: 40 }} />, path: '/admin', color: '#6A1B9A', adminOnly: true },
]

export default function AgentDashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const pendingSync = useLiveQuery(() => db.syncQueue.count(), []) ?? 0

  const cards = ACTIONS.filter((a) => !a.adminOnly || isAdmin)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7FA' }}>
      <AppBar position="static" sx={{ bgcolor: '#1565C0' }}>
        <Toolbar>
          <GpsFixedIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            SIG-GCM
          </Typography>
          <SyncIndicator pendingCount={pendingSync} />
          <IconButton color="inherit" onClick={logout} title="Sair">
            <ExitToAppIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">
            Olá, <strong>{user?.war_name}</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Chip label={user?.rank} size="small" variant="outlined" />
            <Chip label={user?.role?.toUpperCase()} size="small" color="primary" />
            {pendingSync > 0 && (
              <Chip
                icon={<SyncIcon />}
                label={`${pendingSync} pendente(s) para sincronizar`}
                size="small"
                color="warning"
              />
            )}
          </Box>
        </Box>

        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#555' }}>
          Ações Rápidas
        </Typography>

        <Grid container spacing={2}>
          {cards.map((card) => (
            <Grid item xs={6} key={card.path}>
              <Card elevation={2} sx={{ borderRadius: 3 }}>
                <CardActionArea onClick={() => navigate(card.path)} sx={{ p: 2 }}>
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      p: 0,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: card.color,
                        borderRadius: '50%',
                        p: 1.5,
                        color: 'white',
                        display: 'flex',
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      textAlign="center"
                      sx={{ whiteSpace: 'pre-line' }}
                    >
                      {card.label}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
