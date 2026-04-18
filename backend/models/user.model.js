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

        skills: {
            type: [String],
            default: [],
        },
        location: {
            type: String,
            trim: true,
            maxlength: [100, 'Location cannot exceed 100 characters'],
            default: '',
        },
        timezoneOffset: {
            type: Number, // Offset in seconds from UTC
            default: 0,
        },
        timezoneName: {
            type: String,
            default: 'UTC',
        },
        totalConnections: {
            type: Number,
            default: 0,
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

        // --- Professional Identity ---
        coverImage: {
            type: String,
            default: null,
        },
        bio: {
            type: String,
            maxlength: [1000, 'Bio cannot exceed 1000 characters'],
            default: '',
        },

        // --- Gamification & Progression ---
        gamification: {
            xp: { type: Number, default: 0 },
            level: { type: Number, default: 1 },
            badges: [{ 
                name: { type: String, required: true },
                icon: { type: String, default: 'award' },
                description: { type: String, default: '' },
                awardedAt: { type: Date, default: Date.now }
            }],
            // Experience per category for Radar Chart
            // Executive Strategic Domains (4-Axis Consolidation)
            specialties: {
                type: Map,
                of: Number,
                default: () => new Map([
                    ['Strategic', 0],
                    ['Engineering', 0],
                    ['Sustainability', 0],
                    ['Operations', 0]
                ])
            },
            // Engagement streaks
            streaks: {
                current: { type: Number, default: 0 },
                longest: { type: Number, default: 0 },
                lastActivity: { type: Date, default: null }
            },
            // Unlocked UI Frames/Decals
            frames: {
                type: [String],
                default: ['standard']
            }
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

        // --- Notification Management ---
        notificationPrefs: {
            email: { type: Boolean, default: true },
            inApp: { type: Boolean, default: true },
            categories: {
                assignments: {
                    email: { type: Boolean, default: true },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                },
                mentions: {
                    email: { type: Boolean, default: true },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                },
                deadlines: {
                    email: { type: Boolean, default: true },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                },
                statusUpdates: {
                    email: { type: Boolean, default: true },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                },
                comments: {
                    email: { type: Boolean, default: true },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                },
                messages: {
                    email: { type: Boolean, default: false },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                },
                security: {
                    email: { type: Boolean, default: true },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                },
                updates: {
                    email: { type: Boolean, default: true },
                    inApp: { type: Boolean, default: true },
                    push: { type: Boolean, default: true }
                }
            },
            frequency: { 
                type: String, 
                enum: ['instant', 'digest'], 
                default: 'instant' 
            },
            quietHours: {
                enabled: { type: Boolean, default: false },
                start: { type: String, default: '22:00' },
                end: { type: String, default: '08:00' },
                timezone: { type: String, default: 'UTC' }
            }
        },
        interfacePrefs: {
            showTeamClock: { type: Boolean, default: true },
            showWeather: { type: Boolean, default: true },
            showApod: { type: Boolean, default: true },
            showQuote: { type: Boolean, default: true },
            bubbledChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }],
            archivedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }]
        },

        // --- Multi-device Session Management ---
        refreshTokens: [
            {
                token: { type: String, required: true }, // Hashed token
                createdAt: { type: Date, default: Date.now }
            }
        ],
        
        // --- OAuth Secure Exchange (Safari Fix) ---
        tempAuthToken: { type: String, select: false },
        tempAuthTokenExpires: { type: Date, select: false },

        // --- Notifications Subscriptions ---
        pushSubscriptions: [
            {
                endpoint: { type: String, required: true },
                expirationTime: { type: Number, default: null },
                keys: {
                    p256dh: { type: String, required: true },
                    auth: { type: String, required: true }
                },
                userAgent: String,
                createdAt: { type: Date, default: Date.now }
            }
        ]
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
            { $or: [{ assignee: userId }, { assignees: userId }] },
            { 
                $set: { assignee: null },
                $pull: { assignees: userId }
            },
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

// Optimize lookups for Admin Dashboard & Networking
userSchema.index({ role: 1, status: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ totalConnections: -1 });
userSchema.index({ skills: 1 });

module.exports = mongoose.model('User', userSchema);
