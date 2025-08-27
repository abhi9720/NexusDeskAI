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
        onComplete({ userName: userName.trim(), apiKey: apiKey.trim() });
    }

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="text-center animate-fade-in max-w-lg">
                        <div className="w-28 h-28 mx-auto rounded-full bg-primary flex items-center justify-center mb-8 shadow-2xl shadow-primary/30">
                            <SparklesIcon className="w-14 h-14 text-white" />
                        </div>
                        <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">Welcome to TaskFlow AI</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-5 text-lg max-w-md mx-auto">
                            Your intelligent partner in productivity. Let's get you set up in just a moment.
                        </p>
                    </div>
                );
            case 2:
                return (
                    <div className="w-full max-w-md text-center animate-fade-in">
                        <UserCircleIcon className="w-20 h-20 text-primary mx-auto mb-6" />
                        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">What should we call you?</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">This will be used to personalize your experience.</p>
                        <div className="mt-8 text-left">
                            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Name</label>
                            <input
                                type="text"
                                id="userName"
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleNext()}
                                className="w-full px-4 py-3 text-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-primary transition"
                                placeholder="e.g., Courtney"
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="w-full max-w-md text-center animate-fade-in">
                        <div className="w-28 h-28 mx-auto rounded-full bg-primary flex items-center justify-center mb-8 shadow-2xl shadow-primary/30">
                           <KeyIcon className="w-14 h-14 text-white" />
                        </div>
                        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Set up your AI Assistant</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">
                           Provide your Gemini API key to enable AI features. This is optional and can be added later in settings.
                        </p>
                        <div className="mt-8 text-left">
                             <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gemini API Key</label>
                            <input
                                type="password"
                                id="apiKey"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleFinish()}
                                className="w-full px-4 py-3 text-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-primary transition"
                                placeholder="Enter your key (optional)"
                            />
                        </div>
                    </div>
                );
            case 4:
                return (
                     <div className="text-center animate-fade-in">
                        <CheckCircleIcon className="w-28 h-28 text-green-500 mx-auto mb-6" />
                        <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">All Set, {userName}!</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-5 text-lg max-w-md mx-auto">
                           You're ready to start organizing your life with the power of AI.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-sidebar-dark dark:to-brand-dark z-50 flex flex-col justify-center items-center p-4">
            <div className="flex-grow flex justify-center items-center w-full">
                {renderStep()}
            </div>
            <div className="flex-shrink-0 p-6 flex justify-between items-center w-full max-w-lg">
                <div className="flex items-center space-x-2">
                    {[1,2,3,4].map(i => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-300 ${step >= i ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'} ${step === i ? 'w-6' : 'w-2'}`}></div>
                    ))}
                </div>
                {step < 4 ? (
                     <button onClick={step === 3 ? handleFinish : handleNext} className="flex items-center space-x-2 px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all transform hover:scale-105 shadow-xl shadow-primary/20 hover:shadow-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/50">
                        <span>{step === 3 ? 'Finish' : 'Continue'}</span>
                        <ChevronRightIcon className="w-5 h-5"/>
                    </button>
                ) : (
                    <button onClick={handleFinish} className="px-8 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-all transform hover:scale-105 shadow-xl shadow-green-500/20 hover:shadow-green-500/30 focus:outline-none focus:ring-4 focus:ring-green-500/50">
                        Start using the App
                    </button>
                )}
            </div>
        </div>
    );
};

export default OnboardingFlow;