import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import FilterListIcon from '@mui/icons-material/FilterList'
import {
  AppBar,
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Toolbar,
  Typography,
} from '@mui/material'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const TYPE_COLORS: Record<string, string> = {
  Flagrante: '#f44336',
  'Suspeito Abordado': '#ff9800',
  'Acidente de Trânsito': '#2196f3',
  'Violência Doméstica': '#9c27b0',
  Furto: '#795548',
  Roubo: '#e91e63',
  'Tráfico de Drogas': '#4caf50',
  'Perturbação da Ordem': '#607d8b',
  Outros: '#9e9e9e',
}

interface CrimePoint {
  id: number
  code: string
  type: string
  nature: string
  lat: number
  lng: number
  address: string
  date: string
}

export default function MapPage() {
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const [points, setPoints] = useState<CrimePoint[]>([])
  const [filterType, setFilterType] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    leafletMap.current = L.map(mapRef.current, {
      center: [-23.55, -46.63],
      zoom: 13,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(leafletMap.current)

    markersLayer.current = L.layerGroup().addTo(leafletMap.current)
  }, [])

  useEffect(() => {
    const params = filterType ? `?occurrence_type=${filterType}` : ''
    api
      .get(`/intelligence/crime-map${params}`)
      .then((r) => {
        setPoints(r.data.points)
        setTotal(r.data.total)
      })
      .catch(() => {})
  }, [filterType])

  useEffect(() => {
    if (!markersLayer.current) return
    markersLayer.current.clearLayers()

    points.forEach((p) => {
      const color = TYPE_COLORS[p.type] || '#9e9e9e'
      const icon = L.divIcon({
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>`,
        iconSize: [12, 12],
        className: '',
      })
      L.marker([p.lat, p.lng], { icon })
        .bindPopup(
          `<strong>${p.code}</strong><br>${p.type}<br>${p.nature}<br>${p.address}<br><small>${new Date(p.date).toLocaleString('pt-BR')}</small>`,
        )
        .addTo(markersLayer.current!)
    })
  }, [points])

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: '#1565C0' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/admin')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1, fontWeight: 'bold' }}>
            Mapa de Ocorrências
          </Typography>
          <Chip label={`${total} ocorrências`} sx={{ bgcolor: 'white', color: '#1565C0' }} size="small" />
        </Toolbar>
      </AppBar>

      <Paper sx={{ p: 1.5, display: 'flex', gap: 2, alignItems: 'center' }} elevation={0}>
        <FilterListIcon fontSize="small" color="action" />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Filtrar por Tipo</InputLabel>
          <Select value={filterType} label="Filtrar por Tipo" onChange={(e) => setFilterType(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {Object.keys(TYPE_COLORS).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
          {Object.entries(TYPE_COLORS).slice(0, 5).map(([label, color]) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
              <Typography variant="caption">{label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Box ref={mapRef} sx={{ flex: 1 }} />
    </Box>
  )
}
