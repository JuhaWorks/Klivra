import React from 'react';
import { User, Shield, UserMinus } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../../utils/cn';

/**
 * Component representing a single member row in the project members table.
 */
const MemberRow = ({
    member,
    currentUser,
    managerCount,
    isViewer,
    onUpdateRole,
    onRemove,
    isUpdating,
    isRemoving,
    canManage
}) => {
    const isSelf = member.userId?._id === currentUser?._id;
    const isOnlyManager = member.role === 'Manager' && managerCount === 1;

    return (
        <tr className="group hover:bg-white/[0.01] transition-colors">
            <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                        {member.userId?.avatar ? (
                            <img src={member.userId.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-zinc-600" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white leading-none">
                            {member.userId?.name}
                            {isSelf && (
                                <span className="ml-2 text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-tighter">
                                    You
                                </span>
                            )}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">{member.userId?.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        disabled={isViewer || (isSelf && isOnlyManager) || isUpdating}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-zinc-900/50 text-xs font-bold text-zinc-300 transition-all outline-none",
                            "hover:border-emerald-500/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        {member.role}
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content className="z-[100] min-w-[140px] bg-zinc-900 border border-white/10 rounded-2xl p-1 shadow-2xl animate-in fade-in zoom-in duration-200">
                            {['Manager', 'Editor', 'Viewer'].map((role) => (
                                <DropdownMenu.Item
                                    key={role}
                                    onClick={() => onUpdateRole(member.userId._id, role)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl cursor-pointer outline-none transition-all",
                                        member.role === role ? "text-emerald-400" : "text-zinc-400",
                                        "hover:text-white hover:bg-emerald-600"
                                    )}
                                >
                                    {role}
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </td>
            <td className="px-6 py-5 text-xs text-zinc-500">
                {new Date(member.joinedAt).toLocaleDateString()}
            </td>
            <td className="px-6 py-5 text-right">
                {canManage && !isSelf && (
                    <button
                        onClick={() => onRemove(member.userId._id)}
                        disabled={isRemoving}
                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all disabled:opacity-20"
                    >
                        <UserMinus className="w-4 h-4" />
                    </button>
                )}
            </td>
        </tr>
    );
};

export default MemberRow;
