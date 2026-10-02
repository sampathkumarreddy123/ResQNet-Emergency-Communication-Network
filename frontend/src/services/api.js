import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const api = {
  // Health
  getHealth: () => apiClient.get('/health'),

  // Topology
  getTopology: () => apiClient.get('/network/topology'),
  resetTopology: () => apiClient.post('/network/reset'),
  addNode: (nodeData) => apiClient.post('/network/nodes', nodeData),
  removeNode: (nodeId) => apiClient.delete(`/network/nodes/${nodeId}`),
  addLink: (linkData) => apiClient.post('/network/links', linkData),
  updateLinkCost: (linkData) => apiClient.post('/network/links/cost', linkData),
  updateLink: (linkData) => apiClient.post('/network/links/update', linkData),

  // Link Failure & Recovery
  failLink: (data) => apiClient.post('/network/link-failure', data),
  restoreLink: (data) => apiClient.post('/network/link-restore', data),

  // Routing Algorithms
  calculateDijkstra: (data) => apiClient.post('/routing/dijkstra', data),
  calculateDistanceVector: (data) => apiClient.post('/routing/distance-vector', data),
  getRoutingTables: () => apiClient.get('/routing/tables'),

  // CRC
  encodeCRC: (data) => apiClient.post('/crc/encode', data),
  verifyCRC: (data) => apiClient.post('/crc/verify', data),

  // Go-Back-N ARQ
  runGoBackN: (data) => apiClient.post('/arq/go-back-n', data),

  // Congestion / Leaky Bucket
  runLeakyBucket: (data) => apiClient.post('/congestion/leaky-bucket', data),

  // Simulation
  startSimulation: (config) => apiClient.post('/simulation/start', config),
  getSimulation: (id) => apiClient.get(`/simulation/${id}`),
  getSimulationResults: (id) => apiClient.get(`/simulation/${id}/results`),
  getSimulationHistory: (limit = 20) => apiClient.get(`/simulation/history?limit=${limit}`),

  // Analytics
  getAnalyticsSummary: () => apiClient.get('/analytics/summary'),
  getExportUrl: () => `${API_BASE_URL}/analytics/export`,
};

export default api;
