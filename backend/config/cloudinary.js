const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'klivra/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        fetch_format: 'auto',
        quality: 'auto',
        transformation: [{ width: 200, height: 200, crop: 'fill' }],
    },
});

const projectStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'klivra/projects',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        fetch_format: 'auto',
        quality: 'auto',
        transformation: [{ width: 1200, height: 630, crop: 'fill' }],
    },
});

module.exports = { cloudinary, avatarStorage, projectStorage };
