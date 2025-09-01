import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/users/login', credentials),
  register: (userData: { name: string; email: string; password: string; mobile: string; role: string }) =>
    api.post('/users/signup', userData),
  logout: () => api.post('/users/logout'),
  forgotPassword: (email: string) =>
    api.post('/users/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/users/reset-password', { token, password }),
};

// Attendance API endpoints
export const attendanceAPI = {
  checkIn: (data: any) =>
    api.post('/attendances/checkin', data),
  checkOut: (data: any) =>
    api.post('/attendances/checkout', data),
  getAttendance: (employeeId: string, date?: string) =>
    api.get('/attendances', { params: { employeeId, date } }),
  getAllAttendance: (filters?: any) =>
    api.get('/attendances', { params: filters }),
  updateAttendance: (id: string, data: any) =>
    api.put(`/attendances/${id}`, data),
  deleteAttendance: (id: string) =>
    api.delete(`/attendances/${id}`),
  createAttendance: (data: any) =>
    api.post('/attendances', data),
};

// WFH API endpoints
export const wfhAPI = {
  requestWFH: (data: any) => api.post('/wfh/request', data),
  getWFHRequests: (employeeId?: string) =>
    api.get('/wfh', { params: { employeeId } }),
  updateWFHStatus: (id: string, status: string) =>
    api.put(`/wfh/${id}`, { status }),
  deleteWFHRequest: (id: string) => api.delete(`/wfh/${id}`),
};

// User API endpoints
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getAllUsers: () => api.get('/users'),
  getUserById: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getNextEmployeeId: () => api.get('/users/next-employee-id'),
  assignEmployeeIds: () => api.post('/users/assign-employee-ids'),
};

export default api;
