import React, { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import ChatTray from '../components/networking/ChatTray';
import { motion } from 'framer-motion';
const Messaging = () => {

    return (
        <div className="h-full flex flex-col pt-0">
            <ChatTray isPageMode={true} />
        </div>
    );
};

export default Messaging;
