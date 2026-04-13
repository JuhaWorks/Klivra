const StickyNote = require('../models/stickyNote.model');
const Project = require('../models/project.model');
const { logActivity } = require('../utils/activityLogger');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

/**
 * @desc    Get all sticky notes for a project
 * @route   GET /api/projects/:projectId/whiteboard
 * @access  Private
 */
const getNotes = catchAsync(async (req, res, next) => {
    const { projectId } = req.params;
    
    // Authorization is handled by middleware, but we'll fetch notes here
    const notes = await StickyNote.find({ projectId })
        .populate('userId', 'name avatar')
        .sort('zIndex')
        .lean();

    res.status(200).json({
        status: 'success',
        results: notes.length,
        data: notes
    });
});

/**
 * @desc    Create a new sticky note
 * @route   POST /api/projects/:projectId/whiteboard
 * @access  Private
 */
const createNote = catchAsync(async (req, res, next) => {
    const { projectId } = req.params;
    const { content, x, y, color } = req.body;

    // Find the highest z-index to place the new note on top
    const lastNote = await StickyNote.findOne({ projectId }).sort('-zIndex').select('zIndex');
    const nextZIndex = lastNote ? lastNote.zIndex + 1 : 1;

    const note = await StickyNote.create({
        projectId,
        userId: req.user._id,
        content: content || '',
        x: x || 100,
        y: y || 100,
        color: color || '#fef08a',
        zIndex: nextZIndex
    });

    // Populate for the response and socket emission
    await note.populate('userId', 'name avatar');

    await logActivity(projectId, req.user._id, 'EntityUpdate', { 
        action: 'created a sticky note',
        noteId: note._id 
    });

    // Notify other members via socket
    req.io.to(`project_${projectId}`).emit('whiteboard:noteCreated', note);

    res.status(201).json({
        status: 'success',
        data: note
    });
});

/**
 * @desc    Update a sticky note
 * @route   PATCH /api/projects/:projectId/whiteboard/:noteId
 * @access  Private
 */
const updateNote = catchAsync(async (req, res, next) => {
    const { projectId, noteId } = req.params;

    // We use findOneAndUpdate to ensure it belongs to the project
    const note = await StickyNote.findOneAndUpdate(
        { _id: noteId, projectId },
        req.body,
        { returnDocument: 'after', runValidators: true }
    ).populate('userId', 'name avatar');

    if (!note) {
        res.status(404);
        throw new Error('Sticky note not found in this project');
    }

    // Notify other members via socket
    req.io.to(`project_${projectId}`).emit('whiteboard:noteUpdated', note);

    res.status(200).json({
        status: 'success',
        data: note
    });
});

/**
 * @desc    Delete a sticky note
 * @route   DELETE /api/projects/:projectId/whiteboard/:noteId
 * @access  Private
 */
const deleteNote = catchAsync(async (req, res, next) => {
    const { projectId, noteId } = req.params;

    const note = await StickyNote.findOneAndDelete({ _id: noteId, projectId });

    if (!note) {
        res.status(404);
        throw new Error('Sticky note not found');
    }

    // Notify other members via socket
    req.io.to(`project_${projectId}`).emit('whiteboard:noteDeleted', noteId);

    res.status(200).json({
        status: 'success',
        message: 'Sticky note removed'
    });
});

/**
 * @desc    Toggle vote/like on a note
 * @route   POST /api/projects/:projectId/whiteboard/:noteId/vote
 * @access  Private
 */
const toggleVote = catchAsync(async (req, res, next) => {
    const { projectId, noteId } = req.params;
    const userId = req.user._id;

    const note = await StickyNote.findOne({ _id: noteId, projectId });
    if (!note) {
        res.status(404);
        throw new Error('Sticky note not found');
    }

    const voteIndex = note.votes.indexOf(userId);
    if (voteIndex > -1) {
        note.votes.splice(voteIndex, 1);
    } else {
        note.votes.push(userId);
    }

    await note.save();
    await note.populate('userId', 'name avatar');

    // Notify other members via socket
    req.io.to(`project_${projectId}`).emit('whiteboard:noteUpdated', note);

    res.status(200).json({
        status: 'success',
        data: note
    });
});

module.exports = {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
    toggleVote
};
