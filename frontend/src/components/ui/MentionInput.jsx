import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedAvatar } from '../../utils/avatar';

/**
 * MentionInput — a textarea that detects "@" triggers and shows a member dropdown
 * 
 * Props:
 *   value          — controlled textarea value
 *   onChange       — (newValue, mentionedUserIds) => void
 *   members        — [{ userId: { _id, name, avatar, email } }] — project members
 *   placeholder    — string
 *   rows           — number
 *   className      — string
 */
const MentionInput = ({ value, onChange, onMentionChange, members = [], placeholder, rows = 3, className = '' }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownQuery, setDropdownQuery] = useState('');
    const [mentionStart, setMentionStart] = useState(-1);
    const textareaRef = useRef(null);
    const dropdownRef = useRef(null);

    const filteredMembers = members.filter(m => {
        const name = m.userId?.name?.toLowerCase() || '';
        const email = m.userId?.email?.toLowerCase() || '';
        const q = dropdownQuery.toLowerCase();
        return name.includes(q) || email.includes(q);
    }).slice(0, 5);

    const handleKeyDown = useCallback((e) => {
        if (!showDropdown) return;
        if (e.key === 'Escape') { setShowDropdown(false); return; }
        if (e.key === 'Enter' && filteredMembers.length > 0) {
            e.preventDefault();
            insertMention(filteredMembers[0]);
        }
    }, [showDropdown, filteredMembers]);

    const handleChange = useCallback((e) => {
        const text = e.target.value;
        onChange(text);
    }, [onChange]);

    const insertMention = useCallback((member) => {
        if (!member?.userId) return;
        const textarea = textareaRef.current;
        const cursor = textarea.selectionStart;
        const before = value.slice(0, mentionStart);
        const after = value.slice(cursor);
        const mentionText = `@${member.userId.name} `;
        const newValue = before + mentionText + after;

        if (onMentionChange) {
            onMentionChange(prev => [...new Set([...prev, member.userId._id])]);
        }
        
        onChange(newValue);
        setShowDropdown(false);

        // Restore focus and cursor
        setTimeout(() => {
            textarea.focus();
            const newCursor = before.length + mentionText.length;
            textarea.setSelectionRange(newCursor, newCursor);
        }, 10);
    }, [value, mentionStart, onChange, onMentionChange]);

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                textareaRef.current && !textareaRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Render with @mention highlights
    const renderHighlighted = (text) => {
        return text.replace(/@(\w[\w\s]*)/g, '<span class="text-theme font-black">@$1</span>');
    };

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyUp={(e) => {
                    const text = e.target.value;
                    const cursor = e.target.selectionStart;
                    const textBeforeCursor = text.slice(0, cursor);
                    const lastAt = textBeforeCursor.lastIndexOf('@');

                    if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(' ')) {
                        const query = textBeforeCursor.slice(lastAt + 1);
                        setDropdownQuery(query);
                        setMentionStart(lastAt);
                        setShowDropdown(true);
                    } else {
                        setShowDropdown(false);
                    }
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                className={`w-full bg-white/[0.03] border border-white/10 focus:border-theme/40 rounded-xl px-4 py-3 text-[11px] text-white font-medium outline-none transition-all resize-none leading-relaxed shadow-inner placeholder:text-gray-600 ${className}`}
            />

            {/* Hint */}
            <div className="absolute bottom-2.5 right-3 text-[8px] text-tertiary/30 font-medium pointer-events-none">
                Type @ to mention
            </div>

            {/* Mention dropdown */}
            <AnimatePresence>
                {showDropdown && filteredMembers.length > 0 && (
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full left-0 right-0 mb-2 z-10 bg-[#0d0d10]/98 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    >
                        <div className="px-3 py-1.5 text-[8px] font-black text-tertiary/60 uppercase tracking-widest border-b border-white/[0.05]">
                            Mention a team member
                        </div>
                        <div className="p-1">
                            {filteredMembers.map((m, i) => (
                                <button
                                    key={m.userId?._id}
                                    onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-theme/10 transition-all text-left"
                                >
                                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-theme/10 border border-white/10 shrink-0">
                                        {m.userId?.avatar
                                            ? <img src={getOptimizedAvatar(m.userId.avatar, 'xs')} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-theme">{m.userId?.name?.charAt(0)}</div>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black text-primary truncate">{m.userId?.name}</p>
                                        <p className="text-[9px] text-tertiary truncate">{m.userId?.email}</p>
                                    </div>
                                    <div className="text-[7px] font-black text-tertiary/40 uppercase">{m.role}</div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MentionInput;
