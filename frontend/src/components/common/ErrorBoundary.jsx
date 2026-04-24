import React from 'react';
import * as Sentry from '@sentry/react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button, Card } from '../ui/BaseUI';
;

/**
 * Modern 2026 Error Boundary
 * Glassmorphism 2.0, Agentic Ready, Sentry Integrated
 */

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Klivra Engine: Exception Caught | Check Diagnostics', error, errorInfo);
        Sentry.captureException(error, { extra: errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex items-center justify-center p-6 min-h-[400px]">
                    <Card className="max-w-md w-full text-center">
                        <motion.div
                            initial={{ rotate: -10, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            className="w-16 h-16 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20"
                        >
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </motion.div>
                        
                        <h3 className="text-xl font-black text-white mb-3 tracking-tighter">System Interruption</h3>
                        <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                            The requested module encountered a fatal exception. Error diagnostics have been transmitted to the core team.
                        </p>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                leftIcon={RefreshCw}
                                fullWidth
                            >
                                Re-initialize Component
                            </Button>
                            
                            <Button
                                variant="secondary"
                                onClick={() => window.location.href = '/'}
                                leftIcon={Home}
                                fullWidth
                            >
                                Return to Base
                            </Button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
                                Exception ID: {Math.random().toString(36).substring(7).toUpperCase()}
                            </p>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
