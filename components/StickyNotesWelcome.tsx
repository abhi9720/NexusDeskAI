import React from 'react';
import { PinIcon, SparklesIcon, LightBulbIcon, PaletteIcon, CheckIcon } from './icons';

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
        </div>
        <div>
            <h4 className="font-semibold text-gray-800 dark:text-white">{title}</h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
        </div>
    </div>
);


const StickyNotesWelcome = () => {
    return (
        <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white/50 dark:bg-black/20 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center animate-fade-in">
                <div className="hidden md:flex justify-center items-center">
                    <div className="relative w-72 h-72">
                         <div className="absolute w-48 h-48 bg-yellow-300 rounded-lg shadow-xl p-4 transform -rotate-12 top-4 left-4">
                            <h3 className="font-bold text-gray-800">Discuss with Client</h3>
                            <p className="text-sm text-gray-700 mt-2">The client is very satisfied with the current proposal...</p>
                         </div>
                         <div className="absolute w-48 h-48 bg-purple-300 rounded-lg shadow-xl p-4 transform rotate-6 top-20 left-24">
                            <h3 className="font-bold text-gray-800">Go Grocery Shopping</h3>
                            <ul className="text-sm mt-2 space-y-1">
                                <li className="flex items-center"><CheckIcon className="w-4 h-4 mr-2 text-primary"/>Skim Milk</li>
                                <li className="flex items-center">Eggs</li>
                            </ul>
                         </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Desktop Sticky Notes</h2>
                    <div className="space-y-5">
                        <FeatureItem 
                            icon={<PinIcon className="w-6 h-6"/>}
                            title="Pin Your Ideas"
                            description="Keep your notes on a dedicated canvas, so you never miss them."
                        />
                         <FeatureItem 
                            icon={<SparklesIcon className="w-6 h-6"/>}
                            title="One-Click Organize"
                            description="Instantly tidy up your notes into a neat and orderly grid."
                        />
                         <FeatureItem 
                            icon={<PaletteIcon className="w-6 h-6"/>}
                            title="Various Colors"
                            description="Select from a range of colors to categorize and personalize your notes."
                        />
                         <FeatureItem 
                            icon={<LightBulbIcon className="w-6 h-6"/>}
                            title="Instant Capture"
                            description="Seamlessly edit titles, content, or checklists without a separate edit mode."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StickyNotesWelcome;