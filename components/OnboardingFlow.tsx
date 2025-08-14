import React, { useState } from 'react';
import { SparklesIcon, ChevronRightIcon, UserCircleIcon, KeyIcon, CheckCircleIcon } from './icons';

interface OnboardingFlowProps {
  onComplete: (details: { userName: string; apiKey?: string }) => void;
}

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
    const [step, setStep] = useState(1);
    const [userName, setUserName] = useState('');
    const [apiKey, setApiKey] = useState('');

    const handleNext = () => {
        if (step === 2 && !userName.trim()) {
            alert("Please enter your name.");
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleFinish = () => {
        onComplete({ userName: userName.trim(), apiKey: apiKey.trim() || undefined });
    }

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="text-center">
                        <div className="w-24 h-24 mx-auto rounded-full bg-primary flex items-center justify-center mb-6 shadow-lg">
                            <SparklesIcon className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Welcome to TaskFlow AI</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-md mx-auto">
                            Your intelligent partner in productivity. Let's get you set up in just a moment.
                        </p>
                    </div>
                );
            case 2:
                return (
                    <div className="w-full max-w-sm">
                        <UserCircleIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">What should we call you?</h2>
                        <div className="mt-6">
                            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                            <input
                                type="text"
                                id="userName"
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleNext()}
                                className="w-full px-4 py-2 text-lg rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="e.g., Courtney"
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="w-full max-w-sm">
                        <KeyIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Set up your AI Assistant</h2>
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
                           Provide your Gemini API key to enable AI features. This is optional and can be added later in settings.
                        </p>
                        <div className="mt-6">
                             <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gemini API Key</label>
                            <input
                                type="password"
                                id="apiKey"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="Enter your key (optional)"
                            />
                        </div>
                    </div>
                );
            case 4:
                return (
                     <div className="text-center">
                        <CheckCircleIcon className="w-24 h-24 text-green-500 mx-auto mb-6" />
                        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">All Set, {userName}!</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-md mx-auto">
                           You're ready to start organizing your life with the power of AI.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-light dark:bg-sidebar-dark z-50 flex flex-col justify-center items-center p-4 animate-fade-in">
            <div className="flex-grow flex justify-center items-center w-full">
                {renderStep()}
            </div>
            <div className="flex-shrink-0 p-6 flex justify-between items-center w-full max-w-lg">
                <div className="flex items-center space-x-2">
                    {[1,2,3,4].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    ))}
                </div>
                {step < 4 ? (
                     <button onClick={step === 3 ? handleFinish : handleNext} className="flex items-center space-x-2 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-lg">
                        <span>{step === 3 ? 'Finish' : 'Continue'}</span>
                        <ChevronRightIcon className="w-5 h-5"/>
                    </button>
                ) : (
                    <button onClick={handleFinish} className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all transform hover:scale-105 shadow-lg">
                        Start using the App
                    </button>
                )}
            </div>
        </div>
    );
};

export default OnboardingFlow;
