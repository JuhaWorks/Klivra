import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { getOptimizedAvatar } from '../../../utils/avatar';

const TaskAssignees = ({ assigneeIds, setAssigneeIds, projectMembers, isAuthorized }) => {
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    const filteredMembers = useMemo(() => {
        if (!memberSearchQuery.trim()) return projectMembers;
        const q = memberSearchQuery.toLowerCase();
        return projectMembers.filter(m => 
            m.userId?.name?.toLowerCase().includes(q) || 
            m.userId?.email?.toLowerCase().includes(q)
        );
    }, [projectMembers, memberSearchQuery]);

    return (
        <div className="space-y-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl shadow-2xl">
            <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5 flex items-center justify-between">
                    <span>Assignees</span>
                    <span className="text-theme/40 lowercase font-mono">{assigneeIds.length} members</span>
                </label>
                
                <div className="bg-white/[0.01] border border-white/5 rounded-xl flex flex-col focus-within:border-theme/40 transition-all overflow-hidden shadow-inner">
                    <div className="relative group shrink-0 border-b border-white/5 bg-white/[0.02]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <Search className="w-3.5 h-3.5 text-gray-600 group-focus-within:text-theme transition-colors z-10" />
                        </div>
                        <input 
                            type="text"
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder="Search members..."
                            className="w-full bg-transparent border-none pl-9 pr-3 py-2.5 text-[10px] font-black text-white outline-none placeholder:text-gray-800 transition-all font-mono tracking-wide"
                        />
                    </div>

                    <div className="max-h-[140px] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-wrap gap-2 p-3">
                            {filteredMembers.length === 0 ? (
                                <div className="w-full py-4 text-center">
                                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest italic">No members found</p>
                                </div>
                            ) : (
                                filteredMembers.map(m => {
                                    const isSelected = assigneeIds.includes(m.userId?._id);
                                    return (
                                        <button 
                                            key={m.userId?._id}
                                            type="button"
                                            onClick={() => {
                                                if (!isAuthorized) return;
                                                setAssigneeIds(prev => isSelected 
                                                    ? prev.filter(id => id !== m.userId?._id) 
                                                    : [...prev, m.userId?._id]
                                                );
                                            }}
                                            className={twMerge(clsx(
                                                "relative w-8 h-8 rounded-lg overflow-hidden border-2 transition-all group/m",
                                                isSelected ? "border-theme shadow-lg shadow-theme/20 scale-110 z-10" : "border-transparent opacity-40 hover:opacity-100 bg-white/5"
                                            ))}
                                            title={`${m.userId?.name} (${m.userId?.email || 'No email'})`}
                                        >
                                            {m.userId?.avatar ? (
                                                <img src={getOptimizedAvatar(m.userId.avatar, 'xs')} alt={m.userId.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-theme/10 flex items-center justify-center text-[10px] font-black text-theme">
                                                    {m.userId?.name?.charAt(0)}
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-theme/20 flex items-center justify-center backdrop-blur-[1px]">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskAssignees;
