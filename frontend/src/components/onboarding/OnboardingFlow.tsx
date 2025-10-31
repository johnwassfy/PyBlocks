'use client';

import { useState } from 'react';
import GreetingScreen from './GreetingScreen';
import CodingExperienceScreen from './CodingExperienceScreen';
import PythonConfidenceScreen from './PythonConfidenceScreen';
import CompletionScreen from './CompletionScreen';

export interface OnboardingData {
  codingExperience: 'none' | 'little' | 'some' | null;
  pythonConfidence: 'new' | 'bit' | 'good' | null;
}

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    codingExperience: null,
    pythonConfidence: null,
  });

  const handleNext = () => {
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
      // Get JWT from localStorage (make sure to use the correct key, e.g., 'token')
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
      // Store onboarding data in localStorage for now
      localStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      localStorage.setItem('onboardingCompleted', 'true');
      // Redirect to main dashboard after onboarding
      window.location.href = '/dashboard';
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      {steps[currentStep]}
    </div>
  );
}
