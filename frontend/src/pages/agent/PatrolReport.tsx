import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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
  Select,
  Snackbar,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enqueueSync } from '../../db/localDatabase'
import api from '../../services/api'

interface SchoolCrossing { id: number; location: string; start_time: string; end_time: string }
interface ApproachedPerson { id: number; full_name: string; location: string; reason: string }
interface SearchedVehicle { id: number; plate: string; model: string; location: string; result: string }

export default function PatrolReport() {
  const navigate = useNavigate()
  const [shiftStartTime] = useState(new Date().toISOString().slice(0, 16))
  const [sector, setSector] = useState('')
  const [kmInitial, setKmInitial] = useState('')
  const [crossings, setCrossings] = useState<SchoolCrossing[]>([])
  const [persons, setPersons] = useState<ApproachedPerson[]>([])
  const [vehicles, setVehicles] = useState<SearchedVehicle[]>([])
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' })

  const addCrossing = () =>
    setCrossings((c) => [...c, { id: Date.now(), location: '', start_time: '', end_time: '' }])
  const addPerson = () =>
    setPersons((p) => [...p, { id: Date.now(), full_name: '', location: '', reason: '' }])
  const addVehicle = () =>
    setVehicles((v) => [...v, { id: Date.now(), plate: '', model: '', location: '', result: '' }])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      date: new Date().toISOString(),
      shift_open: new Date(shiftStartTime).toISOString(),
      sector,
      km_initial: kmInitial ? parseInt(kmInitial) : undefined,
      auxiliary_ids: [],
    }

    setSaving(true)
    try {
      let reportId: number | null = null
      if (navigator.onLine) {
        const res = await api.post('/patrol-reports', payload)
        reportId = res.data.id

        for (const c of crossings) {
          if (c.location) {
            await api.post(`/patrol-reports/${reportId}/school-crossings`, {
              location: c.location,
              start_time: new Date(c.start_time).toISOString(),
              end_time: c.end_time ? new Date(c.end_time).toISOString() : undefined,
            })
          }
        }
        for (const p of persons) {
          if (p.full_name) {
            await api.post(`/patrol-reports/${reportId}/approached-persons`, {
              full_name: p.full_name,
              location: p.location || undefined,
              reason: p.reason || undefined,
            })
          }
        }
        for (const v of vehicles) {
          if (v.plate) {
            await api.post(`/patrol-reports/${reportId}/searched-vehicles`, {
              plate: v.plate,
              model: v.model || undefined,
              location: v.location || undefined,
              result: v.result || undefined,
            })
          }
        }
        setSnack({ open: true, msg: 'Relatório registrado com sucesso!', severity: 'success' })
      } else {
        await enqueueSync('/api/patrol-reports', 'POST', payload as Record<string, unknown>)
        setSnack({ open: true, msg: 'Salvo offline. Será sincronizado em breve.', severity: 'success' })
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
      <AppBar position="static" sx={{ bgcolor: '#2E7D32' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/agent')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
            Relatório de Serviço Motorizado
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
          DADOS DO TURNO
        </Typography>

        <TextField
          fullWidth
          label="Abertura do Turno"
          type="datetime-local"
          defaultValue={shiftStartTime}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Setor / Área de Patrulhamento"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="KM Inicial da Viatura"
          type="number"
          value={kmInitial}
          onChange={(e) => setKmInitial(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* School Crossings */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" color="primary" fontWeight="bold">
            TRAVESSIAS ESCOLARES
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addCrossing}>Adicionar</Button>
        </Box>
        {crossings.map((c, i) => (
          <Box key={c.id} sx={{ border: '1px solid #ddd', borderRadius: 2, p: 2, mb: 1 }}>
            <TextField
              fullWidth size="small" label="Local" value={c.location} sx={{ mb: 1 }}
              onChange={(e) => setCrossings((x) => x.map((r, j) => j === i ? { ...r, location: e.target.value } : r))}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" label="Início" type="datetime-local" InputLabelProps={{ shrink: true }} value={c.start_time}
                onChange={(e) => setCrossings((x) => x.map((r, j) => j === i ? { ...r, start_time: e.target.value } : r))}
                sx={{ flex: 1 }}
              />
              <TextField size="small" label="Fim" type="datetime-local" InputLabelProps={{ shrink: true }} value={c.end_time}
                onChange={(e) => setCrossings((x) => x.map((r, j) => j === i ? { ...r, end_time: e.target.value } : r))}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        ))}

        {/* Approached Persons */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" color="primary" fontWeight="bold">
            ABORDAGENS / INVESTIGAÇÕES
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addPerson}>Adicionar</Button>
        </Box>
        {persons.map((p, i) => (
          <Box key={p.id} sx={{ border: '1px solid #ddd', borderRadius: 2, p: 2, mb: 1 }}>
            <TextField fullWidth size="small" label="Nome" value={p.full_name} sx={{ mb: 1 }}
              onChange={(e) => setPersons((x) => x.map((r, j) => j === i ? { ...r, full_name: e.target.value } : r))}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" label="Local" value={p.location} sx={{ flex: 1 }}
                onChange={(e) => setPersons((x) => x.map((r, j) => j === i ? { ...r, location: e.target.value } : r))}
              />
              <TextField size="small" label="Motivo" value={p.reason} sx={{ flex: 1 }}
                onChange={(e) => setPersons((x) => x.map((r, j) => j === i ? { ...r, reason: e.target.value } : r))}
              />
            </Box>
          </Box>
        ))}

        {/* Searched Vehicles */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" color="primary" fontWeight="bold">
            VEÍCULOS VISTORIADOS
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addVehicle}>Adicionar</Button>
        </Box>
        {vehicles.map((v, i) => (
          <Box key={v.id} sx={{ border: '1px solid #ddd', borderRadius: 2, p: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField size="small" label="Placa" value={v.plate} sx={{ flex: 1 }}
                onChange={(e) => setVehicles((x) => x.map((r, j) => j === i ? { ...r, plate: e.target.value } : r))}
              />
              <TextField size="small" label="Modelo" value={v.model} sx={{ flex: 1 }}
                onChange={(e) => setVehicles((x) => x.map((r, j) => j === i ? { ...r, model: e.target.value } : r))}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" label="Local" value={v.location} sx={{ flex: 1 }}
                onChange={(e) => setVehicles((x) => x.map((r, j) => j === i ? { ...r, location: e.target.value } : r))}
              />
              <TextField size="small" label="Resultado" value={v.result} sx={{ flex: 1 }}
                onChange={(e) => setVehicles((x) => x.map((r, j) => j === i ? { ...r, result: e.target.value } : r))}
              />
            </Box>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />
        <TextField
          fullWidth multiline rows={3} label="Observações Gerais"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit" fullWidth variant="contained" size="large"
          disabled={saving}
          sx={{ py: 1.5, bgcolor: '#2E7D32' }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Salvar Relatório'}
        </Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
