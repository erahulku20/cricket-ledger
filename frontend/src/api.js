import axios from 'axios';

const rawBaseURL = process.env.REACT_APP_API_BASE_URL || '/api';
const baseURL = rawBaseURL.endsWith('/api')
  ? rawBaseURL
  : rawBaseURL.replace(/\/+$/g, '').trim() + '/api';
const api = axios.create({ baseURL });

export const teamsAPI = {
  getAll: () => api.get('/teams').then(r => r.data),
  getOne: (id) => api.get(`/teams/${id}`).then(r => r.data),
  getFinalSettlement: (id, leagueFee, leaguePaidBy) => api.get(`/teams/${id}/final-settlement`, {
    params: { league_fee: leagueFee, league_paid_by: leaguePaidBy || undefined }
  }).then(r => r.data),
  create: (data) => api.post('/teams', data).then(r => r.data),
  update: (id, data) => api.put(`/teams/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/teams/${id}`).then(r => r.data),
};

export const playersAPI = {
  getAll: (team_id) => api.get('/players', { params: team_id ? { team_id } : {} }).then(r => r.data),
  create: (data) => api.post('/players', data).then(r => r.data),
  update: (id, data) => api.put(`/players/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/players/${id}`).then(r => r.data),
};

export const matchesAPI = {
  getAll: (team_id) => api.get('/matches', { params: team_id ? { team_id } : {} }).then(r => r.data),
  getOne: (id) => api.get(`/matches/${id}`).then(r => r.data),
  create: (data) => api.post('/matches', data).then(r => r.data),
  update: (id, data) => api.put(`/matches/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/matches/${id}`).then(r => r.data),
  updateAttendance: (id, attendance) => api.put(`/matches/${id}/attendance`, { attendance }).then(r => r.data),
};

export const expensesAPI = {
  getByMatch: (matchId) => api.get(`/expenses/match/${matchId}`).then(r => r.data),
  getBalances: (matchId) => api.get(`/expenses/match/${matchId}/balances`).then(r => r.data),
  create: (data) => api.post('/expenses', data).then(r => r.data),
  delete: (id) => api.delete(`/expenses/${id}`).then(r => r.data),
  settleSplit: (splitId) => api.put(`/expenses/splits/${splitId}/settle`).then(r => r.data),
  unsettleSplit: (splitId) => api.put(`/expenses/splits/${splitId}/unsettle`).then(r => r.data),
};

export const pollsAPI = {
  getByMatch: (matchId) => api.get(`/polls/match/${matchId}`).then(r => r.data),
  create: (data) => api.post('/polls', data).then(r => r.data),
  delete: (id) => api.delete(`/polls/${id}`).then(r => r.data),
  respond: (pollId, data) => api.post(`/polls/${pollId}/respond`, data).then(r => r.data),
};

export const backupAPI = {
  download: () => api.get('/backup', { responseType: 'blob' }).then(r => r.data),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard').then(r => r.data),
};

export const isReadOnly = process.env.REACT_APP_READ_ONLY === 'true';
