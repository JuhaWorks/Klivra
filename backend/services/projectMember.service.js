const mongoose = require('mongoose');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const ProjectInvitation = require('../models/projectInvitation.model');
const crypto = require('crypto');
const { logActivity } = require('../utils/activityLogger');
const { sendStandardEmail, getFrontendUrl } = require('../utils/helpers');
const notificationService = require('./notification.service');

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
            const existingMember = project.members.find(m => m.userId.toString() === userToAdd._id.toString());
            if (existingMember) {
                if (existingMember.status === 'rejected') {
                    // Re-invite
                    existingMember.status = 'pending';
                    existingMember.role = role || 'Viewer';
                    await project.save({ session });
                    result = { status: 'success', message: 'User re-invited successfully.', data: project.members };
                    return;
                } else {
                    result = { status: 'success', message: 'User is already a member or pending.', data: project.members };
                    return;
                }
            }

            const finalRole = role || 'Viewer';
            project.members.push({ userId: userToAdd._id, role: finalRole, status: 'pending' });
            await project.save({ session });

            // ── GENERATE SECURE INVITATION TOKEN ──
            const rawToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

            await ProjectInvitation.create([{
                projectId: project._id,
                invitedEmail: email.toLowerCase(),
                token: hashedToken,
                role: finalRole,
                invitedBy: actorId
            }], { session });

            // ── SEND PROFESSIONAL INVITATION EMAIL ──
            const frontendUrl = getFrontendUrl();
            const acceptUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/projects/invitations/token/respond?token=${rawToken}&status=active`;
            const rejectUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/projects/invitations/token/respond?token=${rawToken}&status=rejected`;

            // Prepare email body with professional copy
            const emailBody = `
                <p>Hello <strong>${userToAdd.name}</strong>,</p>
                <p>You have been invited to collaborate on the project <strong>"${project.name}"</strong> as a <strong>${finalRole}</strong>.</p>
                <p>Collaborate in real-time, manage tasks, and brainstorm on the whiteboard with the rest of the team.</p>
            `;

            const emailFooter = `This invitation was sent by ${actorId}. It will expire in 48 hours. If you didn't expect this, you can safely ignore it.`;

            // We use customHtml for the two-button layout
            const customHtml = `
                <div style="margin-top: 30px; display: flex; gap: 12px;">
                    <a href="${acceptUrl}" style="display: inline-block; padding: 14px 28px; background-color: #008c64; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(0, 140, 100, 0.2);">
                        Accept Invitation
                    </a>
                    <a href="${rejectUrl}" style="display: inline-block; padding: 14px 28px; background-color: #f3f4f6; color: #4b5563; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; margin-left:10px;">
                        Decline
                    </a>
                </div>
            `;

            // Fire-and-forget email delivery (don't block the API response)
            sendStandardEmail({
                to: email,
                subject: `Invitation: ${project.name} on Klivra`,
                title: 'New Team Invitation',
                body: emailBody,
                customHtml,
                footer: emailFooter
            }).catch(err => console.error(`[INVITE_EMAIL_ERROR] ${err.message}`));

            // Activity Log (within transaction)
            await logActivity(project._id, actorId, 'MEMBER_ADDED', {
                memberName: userToAdd.name,
                projectName: project.name,
                role: finalRole,
                status: 'pending'
            }, 'Security', { session });
            
            // ── SEND REAL-TIME NOTIFICATION (TOAST + HISTORY) ──
            await notificationService.notify({
                recipientId: userToAdd._id,
                senderId: actorId,
                type: 'Assignment', // Maps to project invitation/assignment
                priority: 'High',
                title: 'New Project Invitation',
                message: `You've been invited to join the project "${project.name}" as a ${finalRole}.`,
                link: '/projects?tab=invites',
                metadata: {
                    projectId: project._id,
                    projectName: project.name,
                    role: finalRole
                }
            }).catch(err => console.error(`[INVITE_NOTIFY_ERROR] ${err.message}`));

            // Prepare socket update
            result = {
                status: 'success',
                message: 'Invitation sent and email delivered',
                data: project.members,
                socketUpdate: {
                    room: `project_${project._id}`,
                    event: 'projectUpdated',
                    payload: {
                        id: project._id,
                        type: 'MEMBER_ADDED',
                        member: { userId: userToAdd._id, role: finalRole, status: 'pending' }
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
     * Respond to a project invite
     */
    static async respondToInvite({ projectId, userId, responseStatus, io }) {
        const session = await mongoose.startSession();
        let result;

        await session.withTransaction(async () => {
            const project = await Project.findById(projectId).session(session);
            if (!project) {
                const error = new Error('Project not found');
                error.statusCode = 404;
                throw error;
            }

            const memberIndex = project.members.findIndex(m => m.userId.toString() === userId.toString());
            if (memberIndex === -1) {
                const error = new Error('Invite not found');
                error.statusCode = 404;
                throw error;
            }

            project.members[memberIndex].status = responseStatus; // 'active' or 'rejected'
            await project.save({ session });

            await logActivity(project._id, userId, 'INVITE_RESPONDED', {
                response: responseStatus
            }, 'Security', { session });

            result = {
                status: 'success',
                message: `Invite ${responseStatus}`,
                data: project.members,
                socketUpdate: {
                    room: `project_${project._id}`,
                    event: 'projectUpdated',
                    payload: {
                        id: project._id,
                        type: 'INVITE_RESPONDED',
                        userId,
                        status: responseStatus
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
     * Update a member's role with transaction
     */
    static async updateMemberRole({ projectId, userId, role, actorId, io }) {
        const session = await mongoose.startSession();
        let result;

        await session.withTransaction(async () => {
            const project = await Project.findById(projectId).populate('members.userId', 'name email').session(session);
            if (!project) {
                const error = new Error('Project not found');
                error.statusCode = 404;
                throw error;
            }

            const memberIndex = project.members.findIndex(m => m.userId._id.toString() === userId);
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
                targetUserName: project.members[memberIndex].userId.name || 'User',
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
            const project = await Project.findById(projectId).populate('members.userId', 'name email').session(session);
            if (!project) {
                const error = new Error('Project not found');
                error.statusCode = 404;
                throw error;
            }

            const member = project.members.find(m => m.userId._id.toString() === userId);
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

            project.members = project.members.filter(m => m.userId._id.toString() !== userId);
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

    /**
     * Respond to a project invite via secure email token
     */
    static async respondViaToken({ token, responseStatus, io }) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        const invitation = await ProjectInvitation.findOne({ 
            token: hashedToken, 
            expiresAt: { $gt: Date.now() } 
        });

        if (!invitation) {
            const error = new Error('Invitation link is invalid or has expired.');
            error.statusCode = 404;
            throw error;
        }

        const project = await Project.findById(invitation.projectId);
        if (!project) throw new Error('Project no longer exists.');

        const user = await User.findOne({ email: invitation.invitedEmail });
        if (!user) throw new Error('Invited user account not found.');

        // Reuse existing response logic
        const result = await this.respondToInvite({
            projectId: project._id,
            userId: user._id,
            responseStatus: responseStatus === 'active' ? 'active' : 'rejected',
            io
        });

        // Cleanup invitation
        await ProjectInvitation.deleteOne({ _id: invitation._id });

        return { ...result, projectName: project.name };
    }
}

module.exports = ProjectMemberService;
