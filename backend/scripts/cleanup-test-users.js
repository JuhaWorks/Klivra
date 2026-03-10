// Run this once to remove all test/demo users from the database
// Usage: node scripts/cleanup-test-users.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const testEmails = [
    'testuser@example.com',
    'newuser2@test.com',
    'browsertest@test.com',
    'debugtest123@test.com',
    'freshuser999@test.com',
];

async function cleanupTestUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const result = await User.deleteMany({ email: { $in: testEmails } });
        console.log(`🗑️  Deleted ${result.deletedCount} test user(s)`);

        // Show remaining users
        const remaining = await User.find({}, 'name email role createdAt');
        console.log(`\n📋 Remaining users in database (${remaining.length}):`);
        remaining.forEach(u => {
            console.log(`  - ${u.email} (${u.name}) [${u.role}] created: ${u.createdAt.toLocaleString()}`);
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

cleanupTestUsers();
