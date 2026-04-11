const axios = require('axios');
const logger = require('../utils/logger');

// Simple in-memory cache for APOD data
let apodCache = {
    data: null,
    lastFetched: null
};

/**
 * @desc    Get NASA Astronomy Picture of the Day (Proxied)
 * @route   GET /api/tools/apod
 * @access  Public
 */
const getApod = async (req, res, next) => {
    try {
        const CACHE_DURATION = 1000 * 60 * 60 * 6; // Cache for 6 hours
        const now = new Date();

        if (apodCache.data && apodCache.lastFetched && (now - apodCache.lastFetched < CACHE_DURATION)) {
            return res.status(200).json({ status: 'success', data: apodCache.data });
        }

        const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
        
        const getDateStr = (offsetDays) => {
            const d = new Date();
            d.setDate(d.getDate() - offsetDays);
            return d.toISOString().split('T')[0];
        };

        const fetchFromNasa = async (offset) => {
            return axios.get('https://api.nasa.gov/planetary/apod', {
                params: {
                    api_key: apiKey,
                    thumbs: true,
                    date: offset ? getDateStr(offset) : undefined,
                },
                timeout: 10000,
            });
        };

        let apodData = null;
        for (let i = 0; i <= 3; i++) {
            try {
                const response = await fetchFromNasa(i);
                if (response.data) {
                    apodData = {
                        title: response.data.title,
                        explanation: response.data.explanation,
                        author: response.data.copyright || 'NASA',
                        url: response.data.media_type === 'video' ? response.data.thumbnail_url : response.data.url,
                        date: response.data.date,
                    };
                    break;
                }
            } catch (err) {
                logger.warn(`NASA APOD attempt ${i} failed: ${err.message}`);
            }
        }

        if (!apodData) {
            // Fallback if NASA is completely down
            apodData = {
                title: 'System Insight',
                explanation: 'Syncing with orbital data systems...',
                author: 'System',
                url: 'https://picsum.photos/seed/system/600/400',
                date: new Date().toISOString().split('T')[0],
            };
        }

        // Update cache
        apodCache = {
            data: apodData,
            lastFetched: now
        };

        res.status(200).json({ status: 'success', data: apodData });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getApod
};
