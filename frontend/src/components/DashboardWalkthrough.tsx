import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface WalkthroughStep {
    targetId: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const steps: WalkthroughStep[] = [
    {
        targetId: 'dashboard-header',
        title: 'Welcome to Your Dashboard! 🚀',
        description: "This is your command center. From here, you can track your progress, see your level, and access all your coding missions!",
        position: 'bottom',
    },
    {
        targetId: 'dashboard-profile',
        title: 'Your Coder Profile 👤',
        description: "Check out your awesome avatar and current level here. Keep coding to earn XP and level up!",
        position: 'bottom',
    },
    {
        targetId: 'dashboard-stats',
        title: 'Track Your Stats 📊',
        description: "See how close you are to the next level. Every mission you complete gets you closer to becoming a Python Master!",
        position: 'bottom',
    },
    {
        targetId: 'dashboard-insights',
        title: 'Smart Insights 💡',
        description: "Our AI analyzes your skills and recommends the best missions for you. Check here for daily tips and focus areas!",
        position: 'top',
    },
    {
        targetId: 'dashboard-mission-map',
        title: 'Your Mission Map 🗺️',
        description: "This is where the adventure happens! Scroll through the map to find your next coding challenge. Good luck!",
        position: 'top',
    },
];

export default function DashboardWalkthrough() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        // Check if user has seen the walkthrough
        const hasSeen = localStorage.getItem('hasSeenDashboardWalkthrough');
        if (!hasSeen) {
            // Small delay to ensure dashboard renders
            setTimeout(() => setIsVisible(true), 1000);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const updateTarget = () => {
            const step = steps[currentStep];
            const element = document.getElementById(step.targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTargetRect(element.getBoundingClientRect());
            }
        };

        // Update immediately and after scroll/resize
        updateTarget();
        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget);

        return () => {
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget);
        };
    }, [currentStep, isVisible]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenDashboardWalkthrough', 'true');
    };

    if (!isVisible) return null;

    const step = steps[currentStep];

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] pointer-events-none">
                    {/* Backdrop with spotlight effect */}
                    <div className="absolute inset-0 bg-black/60 transition-colors duration-500">
                        {targetRect && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: targetRect.left - 10,
                                    top: targetRect.top - 10,
                                    width: targetRect.width + 20,
                                    height: targetRect.height + 20,
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                                    borderRadius: '16px',
                                    transition: 'all 0.5s ease-in-out',
                                }}
                            />
                        )}
                    </div>

                    {/* Character and Popover */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="relative max-w-md w-full mx-4"
                            style={{
                                position: 'absolute',
                                ...(step.position === 'top' && targetRect ? { top: targetRect.top - 280, left: '50%', transform: 'translateX(-50%)' } : {}),
                                ...(step.position === 'bottom' && targetRect ? { top: targetRect.bottom + 40, left: '50%', transform: 'translateX(-50%)' } : {}),
                                ...(step.position === 'center' ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } : {}),
                            }}
                        >
                            <div className="bg-white rounded-3xl shadow-2xl p-6 border-4 border-indigo-100 relative overflow-hidden">
                                {/* Decorative background */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-bl-full -z-10 opacity-50" />

                                <div className="flex items-start gap-4">
                                    {/* Robot Character */}
                                    <div className="flex-shrink-0">
                                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-bounce-slow">
                                            <span className="text-4xl">🤖</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                                            <button
                                                onClick={handleClose}
                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <p className="text-gray-600 mb-6 leading-relaxed">
                                            {step.description}
                                        </p>

                                        {/* Controls */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-1">
                                                {steps.map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'bg-indigo-600 w-6' : 'bg-gray-200'
                                                            }`}
                                                    />
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                {currentStep > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleBack}
                                                        className="text-gray-600 hover:text-indigo-600"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                                        Back
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={handleNext}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl"
                                                >
                                                    {currentStep === steps.length - 1 ? 'Get Started!' : 'Next'}
                                                    {currentStep !== steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
