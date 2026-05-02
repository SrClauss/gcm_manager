import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DownloadIcon from '@mui/icons-material/Download'
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface PeriodRow { period: string; count: number }

function formatPeriod(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  )
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [rows, setRows] = useState<PeriodRow[]>([])
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState<{ total_occurrences: number; active_vehicles: number } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [period, over] = await Promise.all([
        api.get('/intelligence/reports/by-period', {
          params: { date_from: `${dateFrom}T00:00:00`, date_to: `${dateTo}T23:59:59`, group_by: groupBy },
        }),
        api.get('/intelligence/stats/overview', {
          params: { date_from: `${dateFrom}T00:00:00`, date_to: `${dateTo}T23:59:59` },
        }),
      ])
      setRows(period.data)
      setOverview(over.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    const header = 'Período,Ocorrências\n'
    const body = rows.map((r) => `${formatPeriod(r.period)},${r.count}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const total = rows.reduce((s, r) => s + r.count, 0)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7FA' }}>
      <AppBar position="static" sx={{ bgcolor: '#6A1B9A' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/admin')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1, fontWeight: 'bold' }}>
            Relatórios & BI
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        {/* Filters */}
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
              Filtros
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Data Início" type="date" size="small"
                value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: 140 }}
              />
              <TextField
                label="Data Fim" type="date" size="small"
                value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: 140 }}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Agrupar por</InputLabel>
                <Select value={groupBy} label="Agrupar por"
                  onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
                  <MenuItem value="day">Dia</MenuItem>
                  <MenuItem value="week">Semana</MenuItem>
                  <MenuItem value="month">Mês</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={load} disabled={loading} sx={{ bgcolor: '#6A1B9A' }}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Gerar'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {overview && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Card elevation={2} sx={{ flex: 1, minWidth: 140 }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">{overview.total_occurrences}</Typography>
                <Typography variant="body2" color="text.secondary">Ocorrências no Período</Typography>
              </CardContent>
            </Card>
            <Card elevation={2} sx={{ flex: 1, minWidth: 140 }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold">{total}</Typography>
                <Typography variant="body2" color="text.secondary">Total no Gráfico</Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Table */}
        {rows.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Resultados ({rows.length} períodos)
              </Typography>
              <Button startIcon={<DownloadIcon />} onClick={exportCSV} size="small">
                Exportar CSV
              </Button>
            </Box>
            <TableContainer component={Paper} elevation={2}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#6A1B9A' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Período</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Ocorrências</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">% do Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.period} hover>
                      <TableCell>{formatPeriod(r.period)}</TableCell>
                      <TableCell align="right">{r.count}</TableCell>
                      <TableCell align="right">
                        {total > 0 ? ((r.count / total) * 100).toFixed(1) : '0'}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>TOTAL</strong></TableCell>
                    <TableCell align="right"><strong>{total}</strong></TableCell>
                    <TableCell align="right"><strong>100%</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {rows.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            <Typography>Selecione o período e clique em "Gerar" para ver os dados.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
