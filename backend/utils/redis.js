const redis = require('redis');

let redisClient;

const initRedis = async () => {
    try {
        const REDIS_URL = process.env.REDIS_URL || (process.env.NODE_ENV === 'production' ? null : 'redis://localhost:6379');
        
        if (!REDIS_URL) {
            console.warn('⚠️ No REDIS_URL provided, Redis caching disabled.');
            return;
        }

        redisClient = redis.createClient({ 
            url: REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 3) return new Error('Max retries reached');
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        redisClient.on('error', (error) => {}); // Silent error for non-critical cache
        redisClient.on('connect', () => console.log('✅ Redis Connected Successfully!'));

        await redisClient.connect();
    } catch (err) {
        console.warn('⚠️ Failed to connect to Redis (Optional):', err.message);
        redisClient = null; // Ensure we don't try to use a broken client
    }
};

const getRedisClient = () => {
    return redisClient || null;
};

// Middleware to check cache before hitting DB
const cacheMiddleware = (keyPrefix, ttlSeconds = 300) => {
    return async (req, res, next) => {
        try {
            if (!redisClient || !redisClient.isReady) {
                return next(); // Fail gracefully if Redis is down
            }

            // Generate a unique cache key based on route, query, and user
            const key = `${keyPrefix}:${req.user?._id}:${req.originalUrl}`;
            const cachedData = await redisClient.get(key);

            if (cachedData) {
                console.log(`[Redis] Cache HIT for ${key}`);
                return res.status(200).json(JSON.parse(cachedData));
            }

            console.log(`[Redis] Cache MISS for ${key}`);

            // Monkey-patch res.json to intercept the response and save to Redis before sending to client
            const originalSend = res.json;
            res.json = function (body) {
                // Only cache successful GET responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redisClient.setEx(key, ttlSeconds, JSON.stringify(body))
                        .catch(err => console.error('Redis SetEx Error:', err));
                }
                originalSend.call(this, body);
            };

            next();
        } catch (err) {
            console.error('Redis Middleware Error:', err);
            next(); // Proceed to controller if cache fails
        }
    };
};

module.exports = {
    initRedis,
    getRedisClient,
    cacheMiddleware
};
