import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { getOptimizedAvatar } from '../../../utils/avatar';

const TaskAssignees = ({ assigneeIds = [], setAssigneeIds, projectMembers = [], isAuthorized }) => {
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    const filteredMembers = useMemo(() => {
        const members = projectMembers || [];
        if (!memberSearchQuery.trim()) return members;
        const q = memberSearchQuery.toLowerCase();
        return members.filter(m => 
            m.userId?.name?.toLowerCase().includes(q) || 
            m.userId?.email?.toLowerCase().includes(q)
        );
    }, [projectMembers, memberSearchQuery]);

    return (
        <div className="space-y-4 p-1">
            <div className="space-y-3">
                <label className="text-[9px] font-black text-tertiary/60 uppercase tracking-[0.3em] ml-0.5 flex items-center justify-between">
                    <span>Assignees</span>
                    <span className="text-theme/40 lowercase font-mono">{(assigneeIds || []).length} members</span>
                </label>
                
                <div className="flex flex-col gap-4 transition-all overflow-hidden">
                    <div className="relative group shrink-0 py-1 border-b border-glass">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2">
                            <Search className="w-3.5 h-3.5 text-tertiary group-focus-within:text-theme transition-colors z-10" />
                        </div>
                        <input 
                            type="text"
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder="Find teammates..."
                            className="w-full bg-transparent border-none pl-6 pr-3 py-2 text-[10px] font-black text-primary outline-none placeholder:text-tertiary/20 transition-all uppercase tracking-widest"
                        />
                    </div>

                    <div className="max-h-[140px] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-wrap gap-3">
                            {filteredMembers.length === 0 ? (
                                <div className="w-full py-4 text-left">
                                    <p className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest italic">No match found</p>
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
                                                "relative w-8 h-8 rounded-xl overflow-hidden border transition-all active:scale-95 group/m",
                                                isSelected ? "border-theme shadow-lg shadow-theme/30 scale-110 z-10" : "border-glass opacity-40 hover:opacity-100 hover:border-theme/40"
                                            ))}
                                            title={m.userId?.name}
                                        >
                                            {m.userId?.avatar ? (
                                                <img src={getOptimizedAvatar(m.userId.avatar, 'xs')} alt={m.userId.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-sunken flex items-center justify-center text-[10px] font-black text-theme">
                                                    {m.userId?.name?.charAt(0)}
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-theme/10 flex items-center justify-center backdrop-blur-[1px]">
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
