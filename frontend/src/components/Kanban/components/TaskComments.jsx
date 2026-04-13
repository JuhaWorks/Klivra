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
        <div className="py-4 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between px-1.5">
                <label className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-theme" />
                    <span>Discussions ({comments.length})</span>
                </label>
            </div>

            <div className="space-y-4">
                <form onSubmit={handlePostComment} className="relative group">
                    <MentionInput
                        value={commentContent}
                        onChange={(text) => setCommentContent(text)}
                        onMentionChange={setMentionedIds}
                        members={members}
                        placeholder="Type @ to mention team members..."
                        className="min-h-[100px]"
                    />
                    <div className="flex justify-end mt-2">
                        <button type="submit" disabled={!commentContent.trim()} className="px-6 py-2 bg-theme hover:bg-theme-highlight disabled:opacity-30 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95">
                            Post Comment
                        </button>
                    </div>
                </form>

                <div className="space-y-4 pt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {comments.length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <Clock className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                            <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">No activity yet. Start the conversation.</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {comments.map((comment, idx) => (
                                <motion.div 
                                    key={comment._id || idx} 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group/comment"
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                        <img src={getOptimizedAvatar(comment.user?.avatar, 'sm')} alt={comment.user?.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-white">{comment.user?.name}</span>
                                                {comment.user?.role === 'Manager' && <ShieldCheck className="w-3 h-3 text-theme" />}
                                                <span className="text-[8px] font-bold text-gray-600 uppercase">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="text-[12px] text-gray-300 leading-relaxed prose prose-invert max-w-none">
                                            {comment.content}
                                        </div>
                                        
                                        {/* Reactions */}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {comment.reactions?.map(r => (
                                                <button 
                                                    key={r.emoji} 
                                                    onClick={() => handleReaction(comment._id, r.emoji)}
                                                    className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-xs hover:border-theme/30 transition-all flex items-center gap-1.5"
                                                >
                                                    <span>{r.emoji}</span>
                                                    <span className="text-[9px] font-black text-gray-500">{r.count || r.users?.length}</span>
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
