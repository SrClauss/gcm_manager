import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface Vehicle { id: number; plate: string; brand: string; model: string; prefix?: string }

type CheckState = 'ok' | 'problem' | null

interface CheckItem {
  key: string
  label: string
  critical: boolean
  value: CheckState
}

const INITIAL_CHECKS: CheckItem[] = [
  { key: 'siren_ok', label: 'Sirene', critical: true, value: null },
  { key: 'lights_ok', label: 'Luzes / Giroflex', critical: true, value: null },
  { key: 'oil_level_ok', label: 'Nível de Óleo', critical: true, value: null },
  { key: 'tires_ok', label: 'Pneus', critical: true, value: null },
  { key: 'body_ok', label: 'Lataria / Carroceria', critical: false, value: null },
  { key: 'trunk_ok', label: 'Porta-malas / Cofre', critical: false, value: null },
]

export default function VehicleChecklist() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [checklistType, setChecklistType] = useState<'Saída' | 'Retorno'>('Saída')
  const [kmReading, setKmReading] = useState('')
  const [checks, setChecks] = useState<CheckItem[]>(INITIAL_CHECKS)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [blockWarning, setBlockWarning] = useState<string[]>([])
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' })

  useEffect(() => {
    api.get('/fleet/vehicles').then((r) => setVehicles(r.data)).catch(() => {})
  }, [])

  const setCheck = (key: string, value: CheckState) => {
    const updated = checks.map((c) => (c.key === key ? { ...c, value } : c))
    setChecks(updated)
    const criticals = updated.filter((c) => c.critical && c.value === 'problem').map((c) => c.label)
    setBlockWarning(criticals)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle || !kmReading) return

    const payload: Record<string, unknown> = {
      vehicle_id: parseInt(selectedVehicle),
      checklist_type: checklistType,
      km_reading: parseInt(kmReading),
      notes: notes || undefined,
    }
    checks.forEach((c) => {
      payload[c.key] = c.value === null ? null : c.value === 'ok'
    })

    setSaving(true)
    try {
      await api.post('/fleet/checklists', payload)
      const msg = blockWarning.length > 0
        ? `⚠️ Viatura BLOQUEADA por: ${blockWarning.join(', ')}. Inspetor notificado.`
        : 'Checklist registrado com sucesso!'
      setSnack({ open: true, msg, severity: blockWarning.length > 0 ? 'error' : 'success' })
      setTimeout(() => navigate('/agent'), 2500)
    } catch {
      setSnack({ open: true, msg: 'Erro ao salvar. Tente novamente.', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7FA', pb: 4 }}>
      <AppBar position="static" sx={{ bgcolor: '#E65100' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/agent')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
            Checklist de Viatura
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
        <FormControl fullWidth required sx={{ mb: 2 }}>
          <InputLabel>Viatura</InputLabel>
          <Select value={selectedVehicle} label="Viatura" onChange={(e) => setSelectedVehicle(e.target.value)}>
            {vehicles.map((v) => (
              <MenuItem key={v.id} value={String(v.id)}>
                {v.prefix ? `${v.prefix} — ` : ''}{v.brand} {v.model} ({v.plate})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={checklistType}
          exclusive
          onChange={(_, val) => val && setChecklistType(val)}
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="Saída" sx={{ fontWeight: 'bold' }}>SAÍDA</ToggleButton>
          <ToggleButton value="Retorno" sx={{ fontWeight: 'bold' }}>RETORNO</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          required fullWidth label="Leitura do KM"
          type="number" value={kmReading}
          onChange={(e) => setKmReading(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 2 }}>
          INSPEÇÃO DA VIATURA
        </Typography>

        {checks.map((item) => (
          <Paper key={item.key} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {item.label}
                  {item.critical && (
                    <Typography component="span" variant="caption" color="error" sx={{ ml: 0.5 }}>
                      *crítico
                    </Typography>
                  )}
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={item.value}
                exclusive
                onChange={(_, val) => setCheck(item.key, val)}
                size="small"
              >
                <ToggleButton value="ok" sx={{ color: 'green' }}>
                  <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />OK
                </ToggleButton>
                <ToggleButton value="problem" sx={{ color: 'red' }}>
                  <ErrorIcon fontSize="small" sx={{ mr: 0.5 }} />Problema
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Paper>
        ))}

        {blockWarning.length > 0 && (
          <Alert severity="error" icon={<BlockIcon />} sx={{ mb: 2 }}>
            <strong>Bloqueio automático!</strong> Problemas críticos detectados:{' '}
            {blockWarning.join(', ')}. O Inspetor e o Mecânico serão notificados.
          </Alert>
        )}

        <TextField
          fullWidth multiline rows={2} label="Observações"
          value={notes} onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit" fullWidth variant="contained" size="large"
          disabled={saving || !selectedVehicle || !kmReading}
          sx={{ py: 1.5, bgcolor: '#E65100' }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Registrar Checklist'}
        </Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
