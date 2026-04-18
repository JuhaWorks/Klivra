import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import MentionInput from '../../ui/MentionInput';
import { getOptimizedAvatar } from '../../../utils/avatar';

const TaskComments = ({ 
    comments, 
    members,
    commentContent, 
    setCommentContent, 
    mentionedIds, 
    setMentionedIds, 
    handlePostComment,
    handleReaction,
    isNew 
}) => {
    if (isNew) return null;

    return (
        <div className="py-6 border-t border-glass space-y-6">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-theme" />
                    <span>Intelligence Loop ({comments.length})</span>
                </label>
            </div>

            <div className="space-y-6">
                <form onSubmit={handlePostComment} className="relative group px-1">
                    <MentionInput
                        value={commentContent}
                        onChange={(text) => setCommentContent(text)}
                        onMentionChange={setMentionedIds}
                        members={members}
                        placeholder="Add to the collective intelligence..."
                        className="min-h-[100px] bg-transparent border-glass focus:border-theme/40 transition-all rounded-2xl"
                    />
                    <div className="flex justify-end mt-3">
                        <button type="submit" disabled={!commentContent.trim()} className="px-8 py-2.5 bg-theme hover:bg-theme-highlight disabled:opacity-20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-theme-slight active:scale-95">
                            Post Intel
                        </button>
                    </div>
                </form>

                <div className="space-y-6 pt-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar px-1">
                    {comments.length === 0 ? (
                        <div className="py-12 text-center opacity-20">
                            <Clock className="w-8 h-8 text-tertiary mx-auto mb-4" />
                            <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.4em]">Discussion Pending</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {comments.map((comment, idx) => (
                                <motion.div 
                                    key={comment._id || idx} 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    className="flex gap-5 group/comment transition-all py-1"
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-glass shrink-0 transition-transform group-hover/comment:scale-105">
                                        <img src={getOptimizedAvatar(comment.user?.avatar, 'sm')} alt={comment.user?.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-black text-primary uppercase tracking-tight">{comment.user?.name}</span>
                                                {comment.user?.role === 'Manager' && <ShieldCheck className="w-3.5 h-3.5 text-theme" />}
                                                <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest">{new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <div className="text-[12px] text-primary/80 leading-relaxed max-w-none font-medium">
                                            {comment.content}
                                        </div>
                                        
                                        {/* Reactions */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {comment.reactions?.map(r => (
                                                <button 
                                                    key={r.emoji} 
                                                    onClick={() => handleReaction(comment._id, r.emoji)}
                                                    className="px-2.5 py-1.5 bg-sunken border border-glass rounded-xl text-xs hover:border-theme/30 transition-all flex items-center gap-2"
                                                >
                                                    <span>{r.emoji}</span>
                                                    <span className="text-[9px] font-black text-tertiary">{r.count || r.users?.length}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskComments;
