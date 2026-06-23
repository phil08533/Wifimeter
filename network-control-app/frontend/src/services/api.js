import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const deviceApi = {
  list: () => api.get('/devices').then(r => r.data),
  get: (id) => api.get(`/devices/${id}`).then(r => r.data),
  update: (id, data) => api.patch(`/devices/${id}`, data).then(r => r.data),
  setLimit: (id, download_limit, upload_limit) =>
    api.post(`/devices/${id}/limit`, { download_limit, upload_limit }).then(r => r.data),
  setPriority: (id, priority) =>
    api.post(`/devices/${id}/priority`, null, { params: { priority } }).then(r => r.data),
  getSchedules: (id) => api.get(`/devices/${id}/schedules`).then(r => r.data),
  createSchedule: (id, data) => api.post(`/devices/${id}/schedules`, data).then(r => r.data),
  deleteSchedule: (deviceId, scheduleId) =>
    api.delete(`/devices/${deviceId}/schedules/${scheduleId}`).then(r => r.data),
}

export const trafficApi = {
  snapshot: () => api.get('/traffic').then(r => r.data),
  history: (deviceId, limit = 60) =>
    api.get(`/traffic/${deviceId}/history`, { params: { limit } }).then(r => r.data),
}

export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data),
  testRouter: (config) => api.post('/settings/router/test', config).then(r => r.data),
}
