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
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please add a valid email',
            ],
        },
        password: {
            type: String,
            minlength: 6,
            select: false, // Prevents password from being returned in queries by default
            // Password is not required because OAuth users won't have one initially
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // Allows multiple null/undefined values
        },
        githubId: {
            type: String,
            unique: true,
            sparse: true,
        },
        authProviders: {
            type: [String],
            default: ['local'] // e.g., 'local', 'google', 'github'
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
            enum: ['Admin', 'Manager', 'Developer'],
            default: 'Developer',
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
        isBanned: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deactivationDate: {
            type: Date,
            default: null,
        },
        deactivationDuration: {
            type: Number,
            default: null, // Number of days, null means deactivated indefinitely
        },

        // --- Email Verification ---
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationToken: String,
        emailVerificationExpires: Date,

        // --- Secure Email Change Flow ---
        emailChangeOTP: String,
        emailChangeOTPExpires: Date,
        pendingNewEmail: String,
        emailChangeToken: String,
        emailChangeTokenExpires: Date,

        // --- Multi-device Session Management ---
        refreshTokens: [
            {
                token: { type: String, required: true }, // Hashed token
                createdAt: { type: Date, default: Date.now }
            }
        ],
    },
    {
        timestamps: true, // Automatically add createdAt and updatedAt fields
    }
);

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function () {
    // If the password field hasn't been modified, OR doesn't exist (OAuth), skip hashing
    if (!this.isModified('password') || !this.password) {
        return;
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

// Model Statics (Strict MVC)
userSchema.statics.deactivateAndCleanUp = async function (userId, duration) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    user.isActive = false;
    user.deactivationDate = new Date();
    user.deactivationDuration = duration ? parseInt(duration) : null;
    return await user.save();
};

userSchema.statics.deleteAndCleanUp = async function (userId) {
    const Project = mongoose.model('Project');
    const Task = mongoose.model('Task');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await this.findByIdAndDelete(userId).session(session);

        if (!user) {
            throw new Error('User not found');
        }

        // Clean up references in other collections
        await Project.updateMany(
            { 'members.userId': userId },
            { $pull: { members: { userId: userId } } },
            { session }
        );

        await Task.updateMany(
            { assignee: userId },
            { $set: { assignee: null } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();
        return true;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

// Optimize lookups for Admin Dashboard filtering
userSchema.index({ role: 1, status: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
