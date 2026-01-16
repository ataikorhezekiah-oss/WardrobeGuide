
import React, { useState } from 'react';
import { KeyIcon } from './Icons';

interface ApiKeySetupProps {
    onApiKeySubmit: (apiKey: string) => void;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySubmit }) => {
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onApiKeySubmit(apiKey);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        <span className="text-indigo-500">AI</span> Wardrobe Guide
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Please enter your Google AI API key to begin.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="relative">
                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                             <KeyIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="api-key"
                            name="api-key"
                            type="password"
                            autoComplete="off"
                            required
                            className="block w-full rounded-md border-0 py-3 pl-10 pr-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            placeholder="Enter your API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                        >
                            Save and Continue
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    <p>
                        You can get your API key from{' '}
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-500 hover:text-indigo-400">
                             Google AI Studio
                        </a>.
                    </p>
                    <p className="mt-2">
                        Your key is stored securely in your browser's local storage and is never sent to our servers.
                    </p>
                </div>
            </div>
        </div>
    );
};
