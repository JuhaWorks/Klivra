import { API_BASE } from '../store/useAuthStore';

/**
 * Standard utility to normalize and optimize avatar URLs.
 * Handles relative paths, placeholders, Google UserContent, and Cloudinary-style optimization strings.
 */
export const getOptimizedAvatar = (url, size = 'md', name = 'User') => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&format=webp&size=${size === 'sm' ? 64 : 128}`;
    
    let processedUrl = url;

    // 1. Handle Relative Paths (Local Storage)
    if (processedUrl.startsWith('/') && !processedUrl.startsWith('//')) {
        const base = API_BASE.replace(/\/api$/, '');
        processedUrl = `${base}${processedUrl}`;
    }

    // 2. Google UserContent Optimization
    // Handles URLs like https://lh3.googleusercontent.com/a/ACg8ocIzs...=s96-c
    if (processedUrl.includes('googleusercontent.com')) {
        const googleSize = 
            size === 'xxs' ? 's32-c' :
            size === 'xs' ? 's48-c' : 
            size === 'sm' ? 's64-c' : 
            size === 'lg' ? 's400-c' : 's128-c';
        
        // Replace existing size parameter or append it
        if (processedUrl.includes('=s')) {
            return processedUrl.replace(/=s\d+(-c)?/, `=${googleSize}`);
        }
        return `${processedUrl}=${googleSize}`;
    }

    // 3. Advanced Adaptive Cloudinary Resizing
    if (processedUrl.includes('upload/')) {
        const dimensions = 
            size === 'xxs' ? 'w_32,h_32' :
            size === 'xs' ? 'w_48,h_48' : 
            size === 'sm' ? 'w_64,h_64' : 
            size === 'lg' ? 'w_400,h_400' : 'w_200,h_200';
        return processedUrl.replace('upload/', `upload/${dimensions},c_fill,g_face,f_auto,q_auto/`);
    }
    
    return processedUrl;
};
