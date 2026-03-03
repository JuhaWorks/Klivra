import { create } from 'zustand';
import axios from 'axios';

// Resolve the API base URL once.
// We explicitly keep localhost active for local development via Vite proxy, 
// and fallback to Render for production if no env var is provided.
let BASE_URL;
if (import.meta.env.VITE_API_URL) {
    BASE_URL = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`;
} else if (import.meta.env.DEV) {
    // Keep local host proxy for local development
    BASE_URL = '/api';
} else {
    // Production fallback for Vercel
    BASE_URL = 'https://syncforge-io.onrender.com/api';
}

// Create a configured Axios instance
// withCredentials: true ensures the browser attaches the HttpOnly cookie to every request.
export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 15000, // 15s hard timeout — prevents hanging requests
});

// Auto-retry once on network timeout (e.g. transient blip on Render cold-start)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        // Only retry once, and only on network errors / timeouts (no response)
        if (!config._retried && (error.code === 'ECONNABORTED' || !error.response)) {
            config._retried = true;
            await new Promise((r) => setTimeout(r, 400)); // 400 ms back-off
            return api(config);
        }
        return Promise.reject(error);
    }
);


export const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false, // Start as false so Login/Register buttons are immediately interactive
    authChecking: true, // Separate flag for the initial auth check (prevents protected route flash)
    error: null,
    clearError: () => set({ error: null }),

    // 1. Check if the user has an active session cookie
    checkAuth: async () => {
        set({ authChecking: true, error: null });
        try {
            const response = await api.get('/auth/profile');
            set({
                user: response.data.data,
                isAuthenticated: true,
                authChecking: false
            });
        } catch (error) {
            set({
                user: null,
                isAuthenticated: false,
                authChecking: false
            });
        }
    },

    // 2. Register a new user
    register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/auth/register', userData);
            set({ isLoading: false });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Registration failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    // 3. Login user
    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/auth/login', { email, password });
            set({
                user: response.data.data,
                isAuthenticated: true,
                isLoading: false
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Invalid email or password';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    // 4. Logout user (Destroys the server-side cookie and clears client state)
    logout: async () => {
        set({ isLoading: true, error: null });
        try {
            await api.get('/auth/logout');
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false
            });
        } catch (error) {
            console.error('Logout error:', error);
            set({ isLoading: false });
        }
    },

    // 5. Upload avatar image (multipart/form-data)
    uploadAvatar: async (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.post('/auth/profile/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        set((state) => ({ user: { ...state.user, ...response.data.data } }));
        return response.data;
    },

    // 6. Update profile info (name, status, customMessage)
    updateProfile: async (updates) => {
        const response = await api.put('/auth/profile', updates);
        set((state) => ({ user: { ...state.user, ...response.data.data } }));
        return response.data;
    },

    // 7. Change password (requires currentPassword + newPassword)
    changePassword: async (currentPassword, newPassword) => {
        const response = await api.put('/auth/profile/password', { currentPassword, newPassword });
        return response.data;
    },
}));
