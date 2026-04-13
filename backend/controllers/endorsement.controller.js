const Endorsement = require('../models/endorsement.model');
const User = require('../models/user.model');

// @desc    Toggle endorsement for a skill
// @route   POST /api/endorsements/toggle
// @access  Private
const toggleEndorsement = async (req, res, next) => {
    try {
        const { toUserId, skillName } = req.body;
        const fromUserId = req.user._id;

        if (toUserId === fromUserId.toString()) {
            res.status(400);
            return next(new Error('You cannot endorse your own skills'));
        }

        const existing = await Endorsement.findOne({ fromUser: fromUserId, toUser: toUserId, skillName });

        if (existing) {
            await Endorsement.findByIdAndDelete(existing._id);
            res.status(200).json({ status: 'success', action: 'removed' });
        } else {
            await Endorsement.create({ fromUser: fromUserId, toUser: toUserId, skillName });
            res.status(201).json({ status: 'success', action: 'added' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get endorsement counts for a profile
// @route   GET /api/endorsements/user/:id
// @access  Private
const getUserEndorsements = async (req, res, next) => {
    try {
        const endorsements = await Endorsement.find({ toUser: req.params.id });
        
        // Group by skillName
        const counts = endorsements.reduce((acc, curr) => {
            acc[curr.skillName] = (acc[curr.skillName] || 0) + 1;
            return acc;
        }, {});

        // Flag which ones the current user has endorsed
        const myEndorsements = endorsements
            .filter(e => e.fromUser.toString() === req.user._id.toString())
            .map(e => e.skillName);

        res.status(200).json({
            status: 'success',
            data: {
                counts,
                myEndorsements
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    toggleEndorsement,
    getUserEndorsements
};
