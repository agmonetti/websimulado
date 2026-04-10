import axios from 'axios'

// En Docker: nginx hace proxy_pass a http://backend:8000
// En local: axios hace requests a http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // Timeout para cálculos numéricos largos
})

export const rootFindingService = {
  biseccion: (data: any) => api.post('/root-finding/biseccion', data),
  puntoFijo: (data: any) => api.post('/root-finding/punto-fijo', data),
  newtonRaphson: (data: any) => api.post('/root-finding/newton-raphson', data),
  aitken: (data: any) => api.post('/root-finding/aitken', data),
  comparar: (data: any) => axios.post('/api/root-finding/comparar', data),
}

export const differentiationService = {
  diferenciasFinitas: (data: any) => api.post('/differentiation/diferencias-finitas', data),
}

export const integrationService = {
  trapecio: (data: any) => api.post('/integration/trapecio', data),
  rectangulo: (data: any) => api.post('/integration/rectangulo', data),
  simpson13: (data: any) => api.post('/integration/simpson-13', data),
  simpson38: (data: any) => api.post('/integration/simpson-38', data),
  comparar: (data: any) => axios.post('/api/integration/comparar', data)
}

export const interpolationService = {
  lagrange: (data: any) => api.post('/interpolation/lagrange', data),
}

export const monteCarloService = {
  hitOrMiss: (data: any) => api.post('/monte-carlo/hit-or-miss-1d', data),
  valorPromedio1d: (data: any) => api.post('/monte-carlo/valor-promedio-1d', data),
  convergencia1d: (data: any) => api.post('/monte-carlo/convergencia-1d', data),
  valorPromedio2d: (data: any) => api.post('/monte-carlo/valor-promedio-2d', data),
  valorPromedio3d: (data: any) => api.post('/monte-carlo/valor-promedio-3d', data), // <-- ACÁ ESTÁ EL 3D CORRECTO
  estadistico: (data: any) => api.post('/monte-carlo/estadistico-1d', data),
}

export default api
