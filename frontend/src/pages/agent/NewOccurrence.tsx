import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { enqueueSync } from '../../db/localDatabase'
import api from '../../services/api'

const OCCURRENCE_TYPES = [
  'Flagrante',
  'Suspeito Abordado',
  'Acidente de Trânsito',
  'Violência Doméstica',
  'Furto',
  'Roubo',
  'Tráfico de Drogas',
  'Perturbação da Ordem',
  'Outros',
]

const PERSON_CONDITIONS = [
  'Autor', 'Suspeito', 'Investigado', 'Vítima', 'Testemunha', 'Condutor', 'Passageiro',
]

interface PersonForm {
  id: number
  condition: string
  full_name: string
  cpf: string
  phone: string
}

export default function NewOccurrence() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [nature, setNature] = useState('')
  const [type, setType] = useState('')
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16))
  const [street, setStreet] = useState('')
  const [district, setDistrict] = useState('')
  const [number, setNumber] = useState('')
  const [reference, setReference] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [narrative, setNarrative] = useState('')
  const [persons, setPersons] = useState<PersonForm[]>([])
  const [gpsLoading, setGpsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  })

  const captureGPS = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const addPerson = () =>
    setPersons((p) => [
      ...p,
      { id: Date.now(), condition: 'Suspeito', full_name: '', cpf: '', phone: '' },
    ])

  const removePerson = (id: number) => setPersons((p) => p.filter((x) => x.id !== id))

  const updatePerson = (id: number, field: keyof PersonForm, value: string) =>
    setPersons((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nature || !type) return

    const payload = {
      nature,
      type,
      date_time: new Date(dateTime).toISOString(),
      street,
      district,
      number,
      reference_point: reference,
      latitude,
      longitude,
      narrative,
      persons_involved: persons.map(({ condition, full_name, cpf, phone }) => ({
        condition,
        full_name,
        cpf: cpf || undefined,
        phone: phone || undefined,
      })),
      seizures: [],
      vehicles_involved: [],
      auxiliary_ids: [],
    }

    setSaving(true)
    try {
      if (navigator.onLine) {
        await api.post('/occurrences', payload)
        setSnack({ open: true, msg: 'Talão registrado com sucesso!', severity: 'success' })
      } else {
        await enqueueSync('/api/occurrences', 'POST', payload as Record<string, unknown>)
        setSnack({ open: true, msg: 'Salvo offline. Será sincronizado quando houver conexão.', severity: 'success' })
      }
      setTimeout(() => navigate('/agent'), 1500)
    } catch {
      setSnack({ open: true, msg: 'Erro ao salvar. Tente novamente.', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7FA', pb: 4 }}>
      <AppBar position="static" sx={{ bgcolor: '#1565C0' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/agent')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
            Novo Talão de Ocorrência
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
        {/* Basic Info */}
        <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
          DADOS DA OCORRÊNCIA
        </Typography>

        <TextField
          required
          fullWidth
          label="Natureza da Ocorrência"
          value={nature}
          onChange={(e) => setNature(e.target.value)}
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth required sx={{ mb: 2 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={type} label="Tipo" onChange={(e) => setType(e.target.value)}>
            {OCCURRENCE_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Data / Hora"
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
          LOCALIZAÇÃO
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={gpsLoading ? <CircularProgress size={16} /> : <GpsFixedIcon />}
            onClick={captureGPS}
            disabled={gpsLoading}
            size="small"
          >
            {latitude ? `GPS: ${latitude.toFixed(5)}, ${longitude?.toFixed(5)}` : 'Capturar GPS'}
          </Button>
          {latitude && <Chip label="GPS OK" color="success" size="small" />}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            label="Logradouro"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />
          <TextField
            sx={{ width: 100 }}
            label="Nº"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </Box>
        <TextField
          fullWidth
          label="Bairro"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          label="Ponto de Referência"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" color="primary" fontWeight="bold">
            PESSOAS ENVOLVIDAS
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addPerson}>
            Adicionar
          </Button>
        </Box>

        {persons.map((p) => (
          <Box key={p.id} sx={{ border: '1px solid #ddd', borderRadius: 2, p: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <FormControl size="small" sx={{ width: 160 }}>
                <InputLabel>Condição</InputLabel>
                <Select
                  value={p.condition}
                  label="Condição"
                  onChange={(e) => updatePerson(p.id, 'condition', e.target.value)}
                >
                  {PERSON_CONDITIONS.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton size="small" onClick={() => removePerson(p.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <TextField
              fullWidth
              size="small"
              label="Nome Completo"
              value={p.full_name}
              onChange={(e) => updatePerson(p.id, 'full_name', e.target.value)}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="CPF"
                value={p.cpf}
                onChange={(e) => updatePerson(p.id, 'cpf', e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Telefone"
                value={p.phone}
                onChange={(e) => updatePerson(p.id, 'phone', e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
          HISTÓRICO / NARRATIVA
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={5}
          label="Relatório da GCM"
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Descreva os fatos ocorridos..."
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={saving || !nature || !type}
          sx={{ py: 1.5, bgcolor: '#1565C0' }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Registrar Ocorrência'}
        </Button>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
