import { create } from 'zustand';
import axios from 'axios';

// Get user from localStorage if it exists to maintain session across reloads
const userFromStorage = localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user'))
    : null;

const tokenFromStorage = localStorage.getItem('token') || null;

export const useAuthStore = create((set, get) => ({
    user: userFromStorage,
    token: tokenFromStorage,
    isLoading: false,
    error: null,

    // Login Action
    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            // Connect to the backend
            const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://klivra-backend.onrender.com' : 'http://localhost:5000');
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                email,
                password,
            });

            const { data } = response.data; // data contains our user info and token

            // Save to React State
            set({
                user: data,
                token: data.token,
                isLoading: false
            });

            // Persist to Local Storage
            localStorage.setItem('user', JSON.stringify(data));
            localStorage.setItem('token', data.token);

            return true; // Success hook for UI navigation
        } catch (error) {
            set({
                isLoading: false,
                error: error.response?.data?.message || 'Failed to login',
            });
            return false;
        }
    },

    // Logout Action
    logout: () => {
        // Clear Local Storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');

        // Clear React State
        set({ user: null, token: null, error: null });
    },

    // Clear any auth errors from the UI
    clearError: () => set({ error: null }),
}));
