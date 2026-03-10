const { z } = require('zod');

/**
 * Validator for adding a member to a project
 */
const addMemberSchema = z.object({
    body: z.object({
        email: z.string({
            required_error: 'Email is required',
        }).email('Invalid email format'),
        role: z.enum(['Manager', 'Editor', 'Viewer'], {
            error_map: () => ({ message: 'Role must be Manager, Editor, or Viewer' }),
        }).optional(),
    }),
});

/**
 * Validator for updating a member's role
 */
const updateMemberRoleSchema = z.object({
    body: z.object({
        role: z.enum(['Manager', 'Editor', 'Viewer'], {
            required_error: 'Role is required',
            error_map: () => ({ message: 'Role must be Manager, Editor, or Viewer' }),
        }),
    }),
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Project ID'),
        userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID'),
    }),
});

module.exports = {
    addMemberSchema,
    updateMemberRoleSchema,
};
