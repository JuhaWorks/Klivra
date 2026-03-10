import React, { forwardRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Dialog component for inviting new members to the project.
 * Uses forwardRef to allow the parent to focus the email input.
 */
const InviteMemberDialog = forwardRef(({
    isOpen,
    onOpenChange,
    email,
    role,
    onEmailChange,
    onRoleChange,
    onInvite,
    isLoading
}, ref) => {
    return (
        <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
            <Dialog.Trigger asChild>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                    <Plus className="w-4 h-4" />
                    Invite Member
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-950 border border-white/10 p-8 rounded-[32px] shadow-2xl z-[151] animate-in zoom-in-95 duration-300 focus:outline-none">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-white tracking-tight underline decoration-emerald-500 decoration-2">Invite Collaborator</h3>
                        <Dialog.Close className="p-2 hover:bg-white/5 rounded-full transition-all text-zinc-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </Dialog.Close>
                    </div>
                    <form onSubmit={onInvite} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Email Address</label>
                            <input
                                ref={ref}
                                type="email"
                                required
                                value={email}
                                onChange={(e) => onEmailChange(e.target.value)}
                                placeholder="colleague@klivra.com"
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Initial Role</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Manager', 'Editor', 'Viewer'].map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => onRoleChange(r)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-[10px] font-black transition-all border",
                                            role === r
                                                ? "bg-emerald-600 border-emerald-500 text-white"
                                                : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/10"
                                        )}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            disabled={isLoading}
                            className="w-full py-4 bg-white text-zinc-950 font-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />}
                            Send Invite
                        </button>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
});

InviteMemberDialog.displayName = 'InviteMemberDialog';

export default InviteMemberDialog;
