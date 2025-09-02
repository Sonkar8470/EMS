import axios from "axios";
import io from "socket.io-client";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies in requests
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
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
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post("/auth/login", credentials),
  register: (userData: {
    name: string;
    email: string;
    password: string;
    mobile: string;
    role: string;
  }) => api.post("/auth/signup", userData),
  logout: () => api.post("/users/logout"),
  forgotPassword: (email: string) =>
    api.post("/users/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/users/reset-password", { token, password }),
};

// Attendance API endpoints
export const attendanceAPI = {
  checkIn: (data: unknown) => api.post("/attendances/checkin", data),
  checkOut: (data: unknown) => api.post("/attendances/checkout", data),
  getAttendance: (
    employeeId?: string,
    params?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      _sort?: string;
      _order?: "asc" | "desc";
      _limit?: number;
    }
  ) => api.get("/attendances", { params: { employeeId, ...(params || {}) } }),
  getMine: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/attendances/me", { params }),
  getAllAttendance: (filters?: unknown) =>
    api.get("/attendances", { params: filters }),
  updateAttendance: (id: string, data: unknown) =>
    api.put(`/attendances/${id}`, data),
  adminUpdateAttendance: (id: string, data: unknown) =>
    api.put(`/attendances/update/${id}`, data),
  deleteAttendance: (id: string) => api.delete(`/attendances/${id}`),
  createAttendance: (data: unknown) => api.post("/attendances", data),
  mark: (data: {
    inTime?: string;
    outTime?: string;
    location?: { latitude: number; longitude: number };
  }) => api.post("/attendances/mark", data),
};

// WFH API endpoints
export const wfhAPI = {
  requestWFH: (data: unknown) => api.post("/wfh/request", data),
  getWFHRequests: (employeeId?: string) =>
    api.get("/wfh", { params: { employeeId } }),
  updateWFHStatus: (id: string, status: string) =>
    api.put(`/wfh/${id}`, { status }),
  deleteWFHRequest: (id: string) => api.delete(`/wfh/${id}`),
};

// Dashboard API endpoints
export const dashboardAPI = {
  getEmployeeStats: () => api.get("/dashboard/employee-stats"),
  getOverallStats: () => api.get("/dashboard/overall-stats"),
};

// User API endpoints
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: unknown) => api.put("/users/profile", data),
  getAllUsers: () => api.get("/users"),
  getUserById: (id: string) => api.get(`/users/${id}`),
  createUser: (data: unknown) => api.post("/auth/signup", data),
  updateUser: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getNextEmployeeId: () => api.get("/users/next-employee-id"),
  assignEmployeeIds: () => api.post("/users/assign-employee-ids"),
};

// Holidays API endpoints
export const holidaysAPI = {
  list: () => api.get("/holidays"),
  seed: (
    data: Array<{
      date: string;
      holidayName: string;
      day?: string;
      applicable?: boolean;
    }>
  ) => api.post("/holidays/seed", data),
};

export default api;

// ---------------------------
// Socket.IO client singleton
// ---------------------------
let socket: ReturnType<typeof io> | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io("http://localhost:3001", {
      transports: ["websocket"],
    });
  }
  return socket;
};
