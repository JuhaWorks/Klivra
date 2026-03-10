import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarComponent from './Sidebar';
import TopBar from './TopBar';
import GlobalPresence from './GlobalPresence';
import { useIdleTimer } from '../../hooks/useIdleTimer';

const Layout = () => {
    useIdleTimer(); // Global idle tracking
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
<<<<<<< Updated upstream:frontend/src/components/layout/Layout.jsx
        <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-main)] overflow-hidden transition-colors duration-300">
=======
        <div className="flex h-screen bg-rich-black text-white overflow-hidden">
>>>>>>> Stashed changes:frontend/src/components/Layout.jsx
            {/* Sidebar */}
            <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>

            {/* Global Presence Indicator */}
            <GlobalPresence />
        </div>
    );
};

export default Layout;
