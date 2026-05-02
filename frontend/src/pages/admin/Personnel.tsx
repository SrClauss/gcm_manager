import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BadgeIcon from '@mui/icons-material/Badge'
import WarningIcon from '@mui/icons-material/Warning'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface Agent {
  id: number
  badge_number: string
  war_name: string
  full_name: string
  rank: string
  role: string
  is_active: boolean
  driver_license?: string
  driver_license_expiry?: string
  weapon_carry: boolean
}

interface LicenseAlert {
  id: number
  badge_number: string
  war_name: string
  driver_license: string
  driver_license_expiry: string
  days_until_expiry: number
}

export default function PersonnelPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [agents, setAgents] = useState<Agent[]>([])
  const [alerts, setAlerts] = useState<LicenseAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [newAgent, setNewAgent] = useState({
    badge_number: '', war_name: '', full_name: '', role: 'agent',
    rank: 'GCM', password: '', email: '', weapon_carry: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/personnel/agents'),
      api.get('/personnel/license-alerts').catch(() => ({ data: [] })),
    ])
      .then(([agentsRes, alertsRes]) => {
        setAgents(agentsRes.data)
        setAlerts(alertsRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post('/auth/register', newAgent)
      setOpenDialog(false)
      load()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Erro ao criar agente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7FA' }}>
      <AppBar position="static" sx={{ bgcolor: '#2E7D32' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/admin')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1, fontWeight: 'bold' }}>
            Gestão de Efetivo
          </Typography>
          <IconButton color="inherit" onClick={() => setOpenDialog(true)}>
            <AddIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Efetivo (${agents.length})`} />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {alerts.length > 0 && <WarningIcon color="warning" fontSize="small" />}
                Alertas CNH ({alerts.length})
              </Box>
            }
          />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          {tab === 0 && (
            <Grid container spacing={2}>
              {agents.map((a) => (
                <Grid item xs={12} sm={6} md={4} key={a.id}>
                  <Card elevation={2}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Avatar sx={{ bgcolor: '#1565C0' }}>
                          <BadgeIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {a.war_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mat. {a.badge_number}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {a.full_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={a.rank} size="small" />
                        <Chip label={a.role.toUpperCase()} size="small" color="primary" />
                        {a.weapon_carry && <Chip label="Armado" size="small" color="warning" />}
                        {!a.is_active && <Chip label="Inativo" size="small" color="error" />}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {tab === 1 && (
            <Box>
              {alerts.length === 0 ? (
                <Alert severity="success">Nenhuma CNH vencendo nos próximos 30 dias.</Alert>
              ) : (
                alerts.map((a) => (
                  <Alert
                    key={a.id}
                    severity={a.days_until_expiry <= 7 ? 'error' : 'warning'}
                    sx={{ mb: 1 }}
                  >
                    <strong>{a.war_name}</strong> (Mat. {a.badge_number}) — CNH {a.driver_license} vence em{' '}
                    <strong>{a.days_until_expiry} dia(s)</strong> ({a.driver_license_expiry})
                  </Alert>
                ))
              )}
            </Box>
          )}
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cadastrar Novo Agente</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth label="Matrícula" value={newAgent.badge_number}
            onChange={(e) => setNewAgent((x) => ({ ...x, badge_number: e.target.value }))}
            sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Nome de Guerra" value={newAgent.war_name}
            onChange={(e) => setNewAgent((x) => ({ ...x, war_name: e.target.value }))}
            sx={{ mb: 2 }} />
          <TextField fullWidth label="Nome Completo" value={newAgent.full_name}
            onChange={(e) => setNewAgent((x) => ({ ...x, full_name: e.target.value }))}
            sx={{ mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Cargo</InputLabel>
            <Select value={newAgent.role} label="Cargo"
              onChange={(e) => setNewAgent((x) => ({ ...x, role: e.target.value }))}>
              <MenuItem value="agent">GCM / Agente</MenuItem>
              <MenuItem value="inspector">Inspetor</MenuItem>
              <MenuItem value="dispatcher">Despachante / CECOM</MenuItem>
              <MenuItem value="commander">Comandante</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Graduação</InputLabel>
            <Select value={newAgent.rank} label="Graduação"
              onChange={(e) => setNewAgent((x) => ({ ...x, rank: e.target.value }))}>
              <MenuItem value="GCM">GCM</MenuItem>
              <MenuItem value="Sub-Inspetor">Sub-Inspetor</MenuItem>
              <MenuItem value="Inspetor">Inspetor</MenuItem>
              <MenuItem value="Sub-Comandante">Sub-Comandante</MenuItem>
              <MenuItem value="Comandante">Comandante</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Senha Inicial" type="password" value={newAgent.password}
            onChange={(e) => setNewAgent((x) => ({ ...x, password: e.target.value }))}
            sx={{ mb: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
