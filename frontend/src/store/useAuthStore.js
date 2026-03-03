import { create } from 'zustand';
import axios from 'axios';

// Create a configured Axios instance
// withCredentials: true ensures your browser automatically attaches the HttpOnly cookie to every request.
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : (import.meta.env.PROD ? 'https://syncforge-io.onrender.com/api' : 'http://localhost:5000/api'),
    withCredentials: true,
});

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
    }
}));
