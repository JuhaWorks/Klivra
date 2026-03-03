const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
            trim: true,
            maxlength: [50, 'Name can not be more than 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please add a password'],
            minlength: 6,
            select: false, // Prevents password from being returned in queries by default
        },
        avatar: {
            type: String,
            default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            match: [
                /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
                'Please add a valid URL'
            ]
        },
        role: {
            type: String,
            enum: ['Admin', 'Manager', 'Developer', 'Guest'],
            default: 'Guest',
        },
        status: {
            type: String,
            enum: ['Online', 'Away', 'Do Not Disturb', 'Offline'],
            default: 'Online',
        },
        customMessage: {
            type: String,
            maxlength: [150, 'Custom message cannot exceed 150 characters'],
            default: '',
        },
    },
    {
        timestamps: true, // Automatically add createdAt and updatedAt fields
    }
);

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function () {
    // If the password field hasn't been modified, skip hashing (e.g., during email updates)
    if (!this.isModified('password')) {
        return; // <-- Promise-based: just return to skip
    }

    // Generate a salt with complexity 10 (higher means more secure but slower)
    const salt = await bcrypt.genSalt(10);

    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify if an entered password matches the hashed password in the database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
