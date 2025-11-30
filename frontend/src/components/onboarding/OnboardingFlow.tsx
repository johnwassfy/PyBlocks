'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GreetingScreen from './GreetingScreen';
import CodingExperienceScreen from './CodingExperienceScreen';
import PythonConfidenceScreen from './PythonConfidenceScreen';
import CompletionScreen from './CompletionScreen';

export interface OnboardingData {
  codingExperience: 'none' | 'little' | 'some' | null;
  pythonConfidence: 'new' | 'bit' | 'good' | null;
}

import { useRouter } from 'next/navigation';

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    codingExperience: null,
    pythonConfidence: null,
  });

  const handleNext = () => {
    setDirection(1);
    setCurrentStep((prev) => prev + 1);
  };

  const handleUpdateData = (key: keyof OnboardingData, value: string) => {
    setOnboardingData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleComplete = async () => {
    // Map frontend values to backend DTO
    const codingExperienceMap: Record<string, string> = {
      none: 'none',
      little: 'beginner',
      some: 'intermediate',
    };
    const pythonConfidenceMap: Record<string, string> = {
      new: 'none',
      bit: 'some',
      good: 'comfortable',
    };

    const payload = {
      codingExperience: onboardingData.codingExperience ? codingExperienceMap[onboardingData.codingExperience] : undefined,
      pythonFamiliarity: onboardingData.pythonConfidence ? pythonConfidenceMap[onboardingData.pythonConfidence] : undefined,
    };

    try {
      // Get JWT from localStorage
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/learning-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Failed to update learning profile');
      }
      // Store onboarding data in localStorage
      localStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      localStorage.setItem('onboardingCompleted', 'true');
      // Redirect to main dashboard after onboarding with walkthrough flag
      router.push('/dashboard?showWalkthrough=true');
    } catch (err) {
      alert('Error updating learning profile. Please try again.');
      console.error(err);
    }
  };

  const steps = [
    <GreetingScreen key="greeting" onNext={handleNext} />,
    <CodingExperienceScreen
      key="experience"
      selectedOption={onboardingData.codingExperience}
      onSelect={(value) => handleUpdateData('codingExperience', value)}
      onNext={handleNext}
    />,
    <PythonConfidenceScreen
      key="confidence"
      selectedOption={onboardingData.pythonConfidence}
      onSelect={(value) => handleUpdateData('pythonConfidence', value)}
      onNext={handleNext}
    />,
    <CompletionScreen key="completion" onComplete={handleComplete} data={onboardingData} />,
  ];

  const pageVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 1000 : -1000,
      scale: 0.8,
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
        duration: 0.5,
      },
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -1000 : 1000,
      scale: 0.8,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
        duration: 0.5,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {steps[currentStep]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
