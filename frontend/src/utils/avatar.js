import { API_BASE } from '../components/auth/AuthLayout';

/**
 * Standard utility to normalize and optimize avatar URLs.
 * Handles relative paths, placeholders, and Cloudinary-style optimization strings.
 */
export const getOptimizedAvatar = (url) => {
    if (!url) return 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&format=webp';
    
    let processedUrl = url;
    // If it's a relative path, prefix it with API_BASE
    if (processedUrl.startsWith('/') && !processedUrl.startsWith('//')) {
        const base = API_BASE.replace(/\/api$/, '');
        processedUrl = `${base}${processedUrl}`;
    }

    // Cloudinary dynamic resizing (if applicable)
    if (processedUrl.includes('upload/')) {
        return processedUrl.replace('upload/', 'upload/w_200,h_200,c_fill,f_auto,q_auto/');
    }
    
    return processedUrl;
};
