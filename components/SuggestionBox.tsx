
import React, { useEffect, useRef } from 'react';

interface TranscriptItem {
    speaker: 'user' | 'model';
    text: string;
}

interface SuggestionBoxProps {
    transcript: TranscriptItem[];
    isModelSpeaking: boolean;
}

const ModelTypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-2 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
);


export const SuggestionBox: React.FC<SuggestionBoxProps> = ({ transcript, isModelSpeaking }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript, isModelSpeaking]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-full border border-gray-200 dark:border-gray-700 flex flex-col" style={{maxHeight: '75vh'}}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-3 flex-shrink-0">
                Conversation
            </h2>
            <div ref={scrollRef} className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
                {transcript.length === 0 && !isModelSpeaking && (
                     <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 dark:text-gray-400 text-center px-4">Start a session to begin your live style consultation.</p>
                     </div>
                )}
                {transcript.map((item, index) => (
                    <div key={index} className={`flex ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-4 py-2 shadow-sm ${item.speaker === 'user' 
                            ? 'bg-indigo-500 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                            <p className="text-sm leading-normal">{item.text}</p>
                        </div>
                    </div>
                ))}
                {isModelSpeaking && (
                    <div className="flex justify-start">
                        <ModelTypingIndicator />
                    </div>
                )}
                 <div />
            </div>
        </div>
    );
};
