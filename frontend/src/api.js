import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const auth = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
};

export const patients = {
  list: () => API.get('/patients'),
  get: (id) => API.get(`/patients/${id}`),
  create: (data) => API.post('/patients', data),
  update: (id, data) => API.put(`/patients/${id}`, data),
  delete: (id) => API.delete(`/patients/${id}`),
  search: (q) => API.get(`/patients/search/${encodeURIComponent(q)}`),
};

export const clinics = {
  list: () => API.get('/clinics'),
  create: (data) => API.post('/clinics', data),
  delete: (id) => API.delete(`/clinics/${id}`),
};

export const surgeries = {
  list: () => API.get('/surgeries'),
  create: (data) => API.post('/surgeries', data),
  delete: (id) => API.delete(`/surgeries/${id}`),
};

export const stats = {
  get: () => API.get('/stats'),
};

export default API;
