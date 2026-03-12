import { create } from 'zustand';
import axios from 'axios';

// Resolve the API base URL once.
// Local dev: Vite proxy handles /api -> localhost:5000 (same-origin, cookies work)
// Production: vercel.json rewrites /api -> Render backend (same-origin, cookies work)
// Only set VITE_API_URL if you need to bypass both proxies (rare).
// ==========================================
// ENVIRONMENT TOGGLE (Switch between Local and Prod)
// ==========================================

// ==========================================
// ENVIRONMENT DYNAMIC LOGIC
// ==========================================
// 1. If VITE_API_URL is set (Production or .env.development), use it.
// 2. If in DEV mode and no variable exists, fallback to localhost:5000.
// 3. Otherwise, use relative /api (handled by Vercel/Nginx proxy).

const getBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return `${envUrl.replace(/\/$/, '')}/api`;
    
    // Auto-detect local development
    if (import.meta.env.DEV) {
        return 'http://localhost:5000/api';
    }
    
    return '/api';
};

export const BASE_URL = getBaseUrl();
const API_BASE_WITHOUT_API = BASE_URL.replace(/\/api$/, '');

// Fallback to absolute localhost for local development if Vite proxy is NOT being used (rare)
if (import.meta.env.DEV && !BASE_URL.startsWith('/') && !BASE_URL.includes('localhost')) {
    console.warn('[AUTH] BASE_URL is absolute but not localhost in DEV. Ensure this is intentional.');
}

// Create a configured Axios instance
// withCredentials: true ensures the browser attaches the HttpOnly cookie to every request.
export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 10000, 
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
    isCheckingAuth: true, // Set to true by default to prevent premature redirects on mount
    error: null,
    setAccessToken: (token) => set({ accessToken: token }),
    clearError: () => set({ error: null }),

    // 1. Session validation on page reload
    checkAuth: async () => {
        // Prevent redundant checks
        if (get().isAuthenticated) {
            set({ isCheckingAuth: false });
            return;
        }

        set({ isCheckingAuth: true, error: null });
        
        // Safety timeout to prevent the "infinity loading" reported by user
        // even if the interceptor/backend hangs.
        const authCheckPromise = api.get('/auth/me');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 5000)
        );

        try {
            console.log('[AUTH] Checking session status...');
            const response = await Promise.race([authCheckPromise, timeoutPromise]);
            
            set({
                user: response.data.data,
                isAuthenticated: true,
                isCheckingAuth: false
            });
            console.log('[AUTH] Session verified successfully.');
        } catch (error) {
            if (error.message === 'AUTH_TIMEOUT') {
                console.warn('[AUTH] Session check timed out. Proceeding as guest.');
            } else {
                console.log('[AUTH] No active session found.');
            }
            
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
