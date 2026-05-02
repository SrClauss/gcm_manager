import AssessmentIcon from '@mui/icons-material/Assessment'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import GroupIcon from '@mui/icons-material/Group'
import MapIcon from '@mui/icons-material/Map'
import ReportIcon from '@mui/icons-material/Report'
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

interface Stats {
  total_occurrences: number
  active_vehicles: number
  by_type: { type: string; count: number }[]
  by_status: { status: string; count: number }[]
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/intelligence/stats/overview').then((r) => setStats(r.data)).catch(() => {})
  }, [])

  const cards = [
    { label: 'Ocorrências Total', value: stats?.total_occurrences ?? '—', icon: <ReportIcon />, color: '#1565C0' },
    { label: 'Viaturas em Serviço', value: stats?.active_vehicles ?? '—', icon: <DirectionsCarIcon />, color: '#E65100' },
  ]

  const navItems = [
    { label: 'Mapa Tático', icon: <MapIcon />, path: '/admin/map', color: '#1565C0' },
    { label: 'Efetivo', icon: <GroupIcon />, path: '/admin/personnel', color: '#2E7D32' },
    { label: 'Relatórios', icon: <AssessmentIcon />, path: '/admin/reports', color: '#6A1B9A' },
    { label: 'Área do Agente', icon: <ReportIcon />, path: '/agent', color: '#E65100' },
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F0F4F8' }}>
      <AppBar position="static" sx={{ bgcolor: '#0D47A1' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Painel Administrativo
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.war_name} — {user?.rank}
          </Typography>
          <IconButton color="inherit" onClick={logout} title="Sair">
            <ExitToAppIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          Visão Geral
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {cards.map((c) => (
            <Grid item xs={12} sm={6} key={c.label}>
              <Card elevation={2}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ bgcolor: c.color, borderRadius: '50%', p: 1.5, color: 'white' }}>
                    {c.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{c.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {stats && stats.by_type.length > 0 && (
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Ocorrências por Tipo
              </Typography>
              {stats.by_type.map((t) => (
                <Box key={t.type} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                  <Typography variant="body2">{t.type}</Typography>
                  <Typography variant="body2" fontWeight="bold">{t.count}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        )}

        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Navegação
        </Typography>
        <Grid container spacing={2}>
          {navItems.map((item) => (
            <Grid item xs={6} sm={3} key={item.path}>
              <Card
                elevation={2}
                sx={{ cursor: 'pointer', '&:hover': { elevation: 4 }, borderRadius: 3 }}
                onClick={() => navigate(item.path)}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ bgcolor: item.color, borderRadius: '50%', p: 1.5, color: 'white' }}>
                    {item.icon}
                  </Box>
                  <Typography variant="body2" fontWeight="bold" textAlign="center">
                    {item.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
