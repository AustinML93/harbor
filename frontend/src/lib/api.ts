import axios from "axios";
import { clearToken, getToken } from "./auth";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token (forces redirect to login on next navigation)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url === "/auth/login";
    if (err.response?.status === 401 && !isLoginRequest) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
