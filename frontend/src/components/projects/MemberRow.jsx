import React from 'react';
import { User, Shield, UserMinus, ChevronDown, MoreHorizontal, UserCog, History } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';


/**
 * Modern 2026 MemberRow Component
 * Cinematic row interactions with Glassmorphism 2.0 dropdowns
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
        <motion.tr 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={twMerge(clsx(
                "group hover:bg-white/[0.02] transition-colors",
                member.status === 'rejected' && "opacity-50 grayscale"
            ))}
        >
            <td className="px-10 py-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-[#09090b] border border-white/10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 shadow-xl">
                            {member.userId?.avatar ? (
                                <img src={member.userId.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 text-gray-400 font-black text-xs">
                                    {member.userId?.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        {isSelf && (
                            <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-md bg-cyan-500 text-[#09090b] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/40 border border-white/20">
                                You
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                                {member.userId?.name}
                            </p>
                            {member.status === 'pending' && (
                                <span className="px-1.5 py-0.5 rounded bg-yellow-400/10 border border-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                    Pending
                                </span>
                            )}
                            {member.status === 'rejected' && (
                                <span className="px-1.5 py-0.5 rounded bg-red-400/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest">
                                    Declined
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-widest">{member.userId?.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-10 py-6">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        disabled={isViewer || (isSelf && isOnlyManager) || isUpdating || member.status === 'rejected'}
                        className={twMerge(clsx(
                            "flex items-center gap-3 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-gray-300 transition-all outline-none",
                            "hover:border-cyan-500/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed group/trigger"
                        ))}
                    >
                        <Shield className="w-3.5 h-3.5 text-cyan-500/60 transition-colors group-hover/trigger:text-cyan-400" />
                        <span>{member.role}</span>
                        <ChevronDown className="w-3 h-3 text-gray-600 transition-transform group-data-[state=open]:rotate-180" />
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content 
                            className="z-[200] min-w-[180px] glass-2 bg-[#09090b]/80 border border-white/10 rounded-[1.5rem] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                            sideOffset={8}
                        >
                            <div className="px-3 py-2 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Select Clearance</div>
                            {['Manager', 'Editor', 'Viewer'].map((role) => (
                                <DropdownMenu.Item
                                    key={role}
                                    onClick={() => onUpdateRole(member.userId._id, role)}
                                    className={twMerge(clsx(
                                        "flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer outline-none transition-all",
                                        member.role === role ? "bg-cyan-500/10 text-cyan-400" : "text-gray-400",
                                        "hover:bg-white/5 hover:text-white"
                                    ))}
                                >
                                    <div className={twMerge(clsx(
                                        "w-1.5 h-1.5 rounded-full transition-all",
                                        member.role === role ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-gray-800"
                                    ))} />
                                    {role}
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </td>
            <td className="px-10 py-6">
                <div className="flex items-center gap-2 text-gray-500">
                    <History className="w-3.5 h-3.5 opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {new Date(member.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>
            </td>
            <td className="px-10 py-6 text-right">
                <div className="flex items-center justify-end gap-2">
                    {canManage && !isSelf && (
                        <button
                            onClick={() => onRemove(member.userId._id)}
                            disabled={isRemoving}
                            className="p-3 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all disabled:opacity-20 active:scale-90 border border-transparent hover:border-red-500/20 shadow-xl"
                            title="De-authorize Agent"
                        >
                            <UserMinus className="w-4 h-4" />
                        </button>
                    )}
                    <button className="p-3 text-gray-600 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 active:scale-90">
                        <UserCog className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </motion.tr>
    );
};

export default MemberRow;
