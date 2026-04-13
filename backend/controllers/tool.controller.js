const axios = require('axios');
const logger = require('../utils/logger');

// Simple in-memory cache for APOD data
let apodCache = {
    data: null,
    lastFetched: null
};

// Weather Cache: Map of key -> { data, expires }
const weatherCache = new Map();
const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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
                timeout: 3500, // Reduced from 10s to prevent interface hanging
            });
        };

        let apodData = null;
        for (let i = 0; i <= 1; i++) { // Reduced from 4 attempts to 2
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
            // Fallback if NASA is completely down or timing out
            apodData = {
                title: 'System Insight',
                explanation: 'Connecting to orbital intelligence... NASA systems currently under high load.',
                author: 'System Autoprompt',
                url: 'https://picsum.photos/seed/cosmos/1200/800', // Better resolution placeholder
                date: new Date().toISOString().split('T')[0],
            };
        }

        // Update cache
        apodCache = {
            data: apodData,
            lastFetched: now
        };

        res.status(200).json({ status: 'success', data: apodCache.data });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Current Weather from OpenWeather (Proxied)
 * @route   GET /api/tools/weather
 * @access  Private
 */
const getWeather = async (req, res, next) => {
    try {
        const { city, lat, lon } = req.query;
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ status: 'error', message: 'Weather service not configured on server' });
        }

        // 1. Determine Cache Key
        let cacheKey = '';
        if (city) cacheKey = `city:${city.toLowerCase().trim()}`;
        else if (lat && lon) cacheKey = `geo:${lat}:${lon}`;
        else {
            return res.status(400).json({ status: 'error', message: 'Please provide city or coordinates' });
        }

        // 2. Check Cache
        const cached = weatherCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            return res.status(200).json({ status: 'success', data: cached.data });
        }

        // 3. Build Request
        const params = {
            appid: apiKey,
            units: 'metric',
        };
        if (city) params.q = city;
        else if (lat && lon) {
            params.lat = lat;
            params.lon = lon;
        }

        const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', { params });

        const weatherData = {
            city: response.data.name,
            country: response.data.sys.country,
            lat: response.data.coord.lat,
            lon: response.data.coord.lon,
            temp: Math.round(response.data.main.temp),
            tempMin: Math.round(response.data.main.temp_min),
            tempMax: Math.round(response.data.main.temp_max),
            feelsLike: Math.round(response.data.main.feels_like),
            humidity: response.data.main.humidity,
            pressure: response.data.main.pressure,
            cloudiness: response.data.clouds.all,
            description: response.data.weather[0].description,
            icon: response.data.weather[0].icon,
            windSpeed: response.data.wind.speed,
            visibility: Math.round(response.data.visibility / 1000), // in km
            sunrise: response.data.sys.sunrise, // UTC timestamp
            sunset: response.data.sys.sunset, // UTC timestamp
            timestamp: Date.now()
        };

        // 4. Update Cache
        weatherCache.set(cacheKey, {
            data: weatherData,
            expires: Date.now() + WEATHER_CACHE_TTL
        });

        res.status(200).json({ status: 'success', data: weatherData });
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({ status: 'error', message: 'Location not found' });
        }
        next(error);
    }
};

/**
 * @desc    Get Team Timezone Intelligence
 * @route   GET /api/tools/team-times
 * @access  Private
 */
const getTeamIntelligence = async (req, res, next) => {
    try {
        const mongoose = require('mongoose');
        const Project = mongoose.model('Project');
        const User = mongoose.model('User');
        const userId = req.user._id;
        const { projectId } = req.query;

        console.log(`[TEAM_TIME] Fetching intelligence for user: ${userId}${projectId ? ` | Project: ${projectId}` : ''}`);

        let teammateIdStrings = new Set();
        teammateIdStrings.add(userId.toString());

        if (projectId) {
            // 1a. Fetch specific project members
            const project = await Project.findOne({
                _id: projectId,
                'members.userId': userId, // Ensure requester has access
                deletedAt: null
            }).select('members.userId members.status');

            if (!project) {
                return res.status(404).json({ status: 'error', message: 'Project not found or access denied' });
            }

            project.members.forEach(m => {
                if (m.userId && (m.status === 'active' || m.status === 'pending')) {
                    teammateIdStrings.add(m.userId.toString());
                }
            });
        } else {
            // 1b. Find all active/pending projects the user belongs to
            const projects = await Project.find({
                'members.userId': userId,
                deletedAt: null
            }).select('members.userId members.status');

            // 2. Aggregate all teammate IDs (Active or Pending)
            projects.forEach(p => {
                const userInProject = p.members.find(m => m.userId.toString() === userId.toString());
                // Only pull teammates from projects where user is active or pending
                if (userInProject && (userInProject.status === 'active' || userInProject.status === 'pending')) {
                    p.members.forEach(m => {
                        if (m.userId && (m.status === 'active' || m.status === 'pending')) {
                            teammateIdStrings.add(m.userId.toString());
                        }
                    });
                }
            });
        }

        const teammateObjectIds = Array.from(teammateIdStrings).map(id => new mongoose.Types.ObjectId(id));
        console.log(`[TEAM_TIME] Aggregated ${teammateObjectIds.length} unique teammate IDs`);

        // 3. Fetch user details
        const teammates = await User.find({
            _id: { $in: teammateObjectIds },
            isActive: true
        }).select('name avatar location timezoneOffset timezoneName status').lean();

        console.log(`[TEAM_TIME] Found ${teammates.length} active teammate profiles`);

        // 4. Group by logical location/timezone clusters
        const locationGroups = {};
        teammates.forEach(t => {
            const city = t.location?.trim() || 'Remote';
            const offset = (typeof t.timezoneOffset === 'number') ? t.timezoneOffset : 0;
            // Key by offset + city to group accurately
            const key = `${offset}_${city}`;

            if (!locationGroups[key]) {
                locationGroups[key] = {
                    city: city,
                    timezoneName: t.timezoneName || 'UTC',
                    offset: offset,
                    teammates: []
                };
            }

            locationGroups[key].teammates.push({
                _id: t._id,
                name: t.name,
                avatar: t.avatar,
                status: t.status || 'Offline'
            });
        });

        // Sort: User's location first, then alphabetical by city
        const result = Object.values(locationGroups).sort((a, b) => {
            const userInA = a.teammates.some(tm => tm._id.toString() === userId.toString());
            const userInB = b.teammates.some(tm => tm._id.toString() === userId.toString());
            if (userInA) return -1;
            if (userInB) return 1;
            return a.city.localeCompare(b.city);
        });

        console.log(`[TEAM_TIME] Returning ${result.length} location groups to frontend`);

        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error(`[TEAM_TIME_ERROR] ${error.message}`);
        next(error);
    }
};

/**
 * @desc    Reverse Geocode coordinates to city name
 * @route   GET /api/tools/reverse-geocode
 * @access  Private
 */
const reverseGeocode = async (req, res, next) => {
    try {
        const { lat, lon } = req.query;
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!lat || !lon) {
            return res.status(400).json({ status: 'error', message: 'Lat and Lon are required' });
        }

        const response = await axios.get('http://api.openweathermap.org/geo/1.0/reverse', {
            params: {
                lat,
                lon,
                limit: 1,
                appid: apiKey
            }
        });

        if (response.data && response.data.length > 0) {
            res.status(200).json({ status: 'success', data: response.data[0] });
        } else {
            res.status(404).json({ status: 'error', message: 'No city found for these coordinates' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getApod,
    getWeather,
    getTeamIntelligence,
    reverseGeocode
};
