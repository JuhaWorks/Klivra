import { create } from 'zustand';
import axios from 'axios';

// Resolve the API base URL once.
// Local dev: Vite proxy handles /api -> localhost:5000 (same-origin, cookies work)
// Production: vercel.json rewrites /api -> Render backend (same-origin, cookies work)
// Only set VITE_API_URL if you need to bypass both proxies (rare).
// ==========================================
// ENVIRONMENT TOGGLE (Switch between Local and Prod)
// ==========================================

// --- CASE A: FOR LOCALHOST DEVELOPMENT ---
let BASE_URL = 'http://localhost:5000/api';

// --- CASE B: FOR LIVE SERVER (VERCEL/RENDER) ---
// let BASE_URL = '/api'; 

// --- AUTOMATIC DETECTION (BACKUP) ---
if (import.meta.env.VITE_API_URL) {
    BASE_URL = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`;
} else if (!import.meta.env.DEV && BASE_URL === 'http://localhost:5000/api') {
    BASE_URL = '/api'; // Fallback to relative path in production if not manually set
}

// Create a configured Axios instance
// withCredentials: true ensures the browser attaches the HttpOnly cookie to every request.
export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 10000, // 10s maximum to prevent infinite hangs on load
});

// Add Request Interceptor to inject the access token
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Configure Response Interceptor for automated token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

// Routes that should NEVER trigger a token refresh attempt
const NO_REFRESH_ROUTES = ['/auth/refresh', '/auth/login', '/auth/register'];

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 1. Intercept 401 Unauthorized for automated token refresh
        const shouldRefresh =
            error.response?.status === 401 &&
            !originalRequest._retry &&
            // Check if the URL contains any of the NO_REFRESH_ROUTES
            !NO_REFRESH_ROUTES.some(route => originalRequest.url?.includes(route));

        if (shouldRefresh) {
            console.log(`[AUTH] 401 detected on ${originalRequest.url}. Attempting refresh...`);

            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Securely request a new short-lived access token using the HttpOnly refresh cookie
                console.log(`[AUTH] Calling /auth/refresh...`);
                const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
                const newAccessToken = response.data.accessToken;

                console.log(`[AUTH] Refresh successful. New token obtained.`);

                // Update store state with new token
                useAuthStore.setState({ accessToken: newAccessToken });

                processQueue(null, newAccessToken);

                // Retry the original failed request
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error(`[AUTH] Refresh failed:`, refreshError.response?.status || refreshError.message);
                processQueue(refreshError, null);
                // If it's a 401 during refresh, it means the refresh token is also invalid/expired
                useAuthStore.getState().logout(true);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Removed the aggressive auto-retry logic for transient errors.
        // It was causing 30s timeouts to double into 1-2 minute hangs 
        // when the backend was unreachable or cold-starting.
        
        return Promise.reject(error);
    }
);


export const useAuthStore = create((set, get) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    isCheckingAuth: false, // Default to false to avoid hang, set to true inside checkAuth
    error: null,
    setAccessToken: (token) => set({ accessToken: token }),
    clearError: () => set({ error: null }),

    // 1. Session validation on page reload
    // Uses /auth/me which IS allowed to trigger the 401 refresh interceptor.
    // Flow: GET /me → 401 (no token) → interceptor calls /refresh with cookie → gets token → retries /me → success
    checkAuth: async () => {
        // Prevent concurrent or redundant checks
        if (get().isCheckingAuth || get().isAuthenticated) return;

        set({ isCheckingAuth: true, error: null });
        try {
            console.log('[AUTH] Checking session...');
            // Force a fast fail on the initial load check—don't let the global 10s timeout hang the UI
            const response = await api.get('/auth/me', { timeout: 3000 });
            set({
                user: response.data.data,
                // The refresh interceptor might have updated our state.accessToken automatically
                // but if not, we should check if the interceptor logic should be more explicit.
                isAuthenticated: true,
                isCheckingAuth: false
            });
        } catch (error) {
            set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isCheckingAuth: false
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
    login: async (email, password, rememberMe = false, reactivate = false) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/auth/login', { email, password, rememberMe, reactivate });
            set({
                user: response.data.data,
                accessToken: response.data.accessToken,
                isAuthenticated: true,
                isLoading: false
            });
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            if (error.response?.data?.requiresReactivation) {
                throw error.response.data;
            }
            const errorMessage = error.response?.data?.message || 'Invalid email or password';
            set({ error: errorMessage });
            throw new Error(errorMessage);
        }
    },

    // 4. Logout user
    logout: async (forceClientSide = false) => {
        set({ isLoading: true, error: null });
        try {
            if (!forceClientSide) {
                console.log('[AUTH] Calling backend logout...');
                await api.get('/auth/logout').catch(err => console.log('[AUTH] Backend logout failed (likely expired), proceeding with client-side cleanup.'));
            }
            set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isLoading: false
            });
        } catch (error) {
            console.error('Logout error:', error);
            set({ isLoading: false });
        }
    },

    // 5. Upload avatar image
    uploadAvatar: async (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.post('/auth/profile/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        set((state) => ({ user: { ...state.user, ...response.data.data } }));
        return response.data;
    },

    // 5.5. Remove avatar image
    removeAvatar: async () => {
        const response = await api.delete('/auth/profile/avatar');
        set((state) => ({ user: { ...state.user, ...response.data.data } }));
        return response.data;
    },

    // 6. Update profile info
    updateProfile: async (updates) => {
        const response = await api.put('/auth/profile', updates);
        set((state) => ({ user: { ...state.user, ...response.data.data } }));
        return response.data;
    },

    // 7. Change password
    changePassword: async (currentPassword, newPassword) => {
        const response = await api.put('/auth/profile/password', { currentPassword, newPassword });
        return response.data;
    },

    // 7.5. Update status
    updateStatus: async (status) => {
        const response = await api.put('/auth/profile/status', { status });
        set((state) => ({ user: { ...state.user, status: response.data.data.status } }));
        return response.data;
    },

    // 8. Synchronize email after update
    syncEmail: (newEmail) => {
        set((state) => ({
            user: state.user ? { ...state.user, email: newEmail } : null
        }));
    },
}));
