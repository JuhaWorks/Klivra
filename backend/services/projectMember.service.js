const mongoose = require('mongoose');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const { logActivity } = require('../utils/activityLogger');

/**
 * Service to handle all project member related operations.
 * Implements strict transaction management for atomicity.
 */
class ProjectMemberService {
    /**
     * Add a member to a project with transaction
     */
    static async addMember({ projectId, email, role, actorId, io }) {
        const session = await mongoose.startSession();
        let result;

        await session.withTransaction(async () => {
            const userToAdd = await User.findOne({ email }).session(session);
            if (!userToAdd) {
                const error = new Error('User not found');
                error.statusCode = 404;
                throw error;
            }

            const project = await Project.findById(projectId).session(session);
            if (!project) {
                const error = new Error('Project not found');
                error.statusCode = 404;
                throw error;
            }

            // Idempotency check
            if (project.isMember(userToAdd._id)) {
                result = { status: 'success', message: 'User is already a member.', data: project.members };
                return;
            }

            const finalRole = role || 'Viewer';
            project.members.push({ userId: userToAdd._id, role: finalRole });
            await project.save({ session });

            // Activity Log (within transaction)
            await logActivity(project._id, actorId, 'MEMBER_ADDED', {
                memberName: userToAdd.name,
                projectName: project.name,
                role: finalRole
            }, 'Security', { session });

            // Prepare socket update (don't emit inside transaction, but prepare data)
            result = {
                status: 'success',
                data: project.members,
                socketUpdate: {
                    room: `project_${project._id}`,
                    event: 'projectUpdated',
                    payload: {
                        id: project._id,
                        type: 'MEMBER_ADDED',
                        member: { userId: userToAdd._id, role: finalRole }
                    }
                }
            };
        });

        session.endSession();

        // Broadcast if successful
        if (result?.socketUpdate && io) {
            io.to(result.socketUpdate.room).emit(result.socketUpdate.event, result.socketUpdate.payload);
        }

        return result;
    }

    /**
     * Update a member's role with transaction
     */
    static async updateMemberRole({ projectId, userId, role, actorId, io }) {
        const session = await mongoose.startSession();
        let result;

        await session.withTransaction(async () => {
            const project = await Project.findById(projectId).session(session);
            if (!project) {
                const error = new Error('Project not found');
                error.statusCode = 404;
                throw error;
            }

            const memberIndex = project.members.findIndex(m => m.userId.toString() === userId);
            if (memberIndex === -1) {
                const error = new Error('Member not found');
                error.statusCode = 404;
                throw error;
            }

            // Block demoting self if only manager
            if (userId === actorId.toString() && project.members[memberIndex].role === 'Manager' && role !== 'Manager') {
                if (project.getManagerCount() === 1) {
                    const error = new Error('You cannot demote yourself. Assign another Manager first.');
                    error.statusCode = 400;
                    throw error;
                }
            }

            project.members[memberIndex].role = role;
            await project.save({ session });

            await logActivity(project._id, actorId, 'MEMBER_ROLE_UPDATED', {
                targetUserId: userId,
                targetUserName: project.members[memberIndex].userId.name || 'User', // May need populating if name not directly on member subdoc
                projectName: project.name,
                newRole: role
            }, 'Security', { session });

            result = {
                status: 'success',
                data: project.members,
                socketUpdate: {
                    room: `project_${project._id}`,
                    event: 'projectUpdated',
                    payload: {
                        id: project._id,
                        type: 'MEMBER_ROLE_UPDATED',
                        userId,
                        newRole: role
                    }
                }
            };
        });

        session.endSession();

        if (result?.socketUpdate && io) {
            io.to(result.socketUpdate.room).emit(result.socketUpdate.event, result.socketUpdate.payload);
        }

        return result;
    }

    /**
     * Remove a member from a project with transaction
     */
    static async removeMember({ projectId, userId, actorId, io }) {
        const session = await mongoose.startSession();
        let result;

        await session.withTransaction(async () => {
            const project = await Project.findById(projectId).session(session);
            if (!project) {
                const error = new Error('Project not found');
                error.statusCode = 404;
                throw error;
            }

            const member = project.members.find(m => m.userId.toString() === userId);
            if (!member) {
                const error = new Error('Member not found');
                error.statusCode = 404;
                throw error;
            }

            // Last Manager Standing Check
            if (member.role === 'Manager') {
                if (project.getManagerCount() === 1) {
                    const error = new Error('You cannot leave or be removed without transferring ownership first. Assign a new Manager or delete the project.');
                    error.statusCode = 400;
                    throw error;
                }
            }

            project.members = project.members.filter(m => m.userId.toString() !== userId);
            await project.save({ session });

            await logActivity(project._id, actorId, 'MEMBER_REMOVED', {
                targetUserId: userId,
                targetUserName: member.userId.name || 'User',
                projectName: project.name
            }, 'Security', { session });

            result = {
                status: 'success',
                message: 'Member removed successfully',
                socketUpdate: {
                    room: `project_${project._id}`,
                    event: 'projectUpdated',
                    payload: {
                        id: project._id,
                        type: 'MEMBER_REMOVED',
                        userId
                    }
                }
            };
        });

        session.endSession();

        if (result?.socketUpdate && io) {
            io.to(result.socketUpdate.room).emit(result.socketUpdate.event, result.socketUpdate.payload);
        }

        return result;
    }
}

module.exports = ProjectMemberService;
