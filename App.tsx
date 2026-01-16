
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { WebcamFeed } from './components/WebcamFeed';
import { SuggestionBox } from './components/SuggestionBox';
import { CameraIcon, StopCircleIcon } from './components/Icons';
import { useCamera } from './hooks/useCamera';
import { encode, decode, decodeAudioData } from './utils/audio';

const PROMPT = `You are a world-class AI fashion stylist having a friendly, real-time voice conversation. Your goal is to provide helpful, concise, and encouraging feedback on a user's outfit as you see it through their camera. Keep your responses short and conversational.

Analyze the outfit in the image and comment on what you see. Provide actionable suggestions for improvement. Acknowledge the user's speech and respond naturally.

If the image is unclear, the person is not wearing a clear outfit, or the image is inappropriate, politely ask them to adjust the camera.`;

interface TranscriptItem {
    speaker: 'user' | 'model';
    text: string;
}

const App: React.FC = () => {
    // Media and Camera
    const { stream: videoStream, error: cameraError, startCamera, stopCamera } = useCamera();
    const micStreamRef = useRef<MediaStream | null>(null);
    
    // Session State
    const [isSessionActive, setIsSessionActive] = useState(false);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const [isModelSpeaking, setIsModelSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    
    // Transcript
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    // Audio
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const stopSession = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        stopCamera();
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
        }
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        if(scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current = null;
        }
        if(inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
          inputAudioContextRef.current.close().catch(console.error);
          inputAudioContextRef.current = null;
        }
         if(outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
          outputAudioContextRef.current.close().catch(console.error);
          outputAudioContextRef.current = null;
        }

        setIsSessionActive(false);
        setTranscript([]);
        setIsListening(false);
        setIsModelSpeaking(false);
    }, [stopCamera]);

    const handleToggleSession = async () => {
        if (isSessionActive) {
            stopSession();
            setSessionError(null);
            return;
        }

        setIsSessionActive(true);
        setTranscript([]);
        setSessionError(null);
        startCamera(); 

        try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = micStream;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            if (outputAudioContextRef.current.state === 'suspended') {
                outputAudioContextRef.current.resume();
            }

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: PROMPT,
                },
                callbacks: {
                    onopen: () => {
                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = inputAudioContextRef.current.createMediaStreamSource(micStream);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        let hasUserInput = false;
                        let hasModelOutput = false;

                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            hasUserInput = true;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                            hasModelOutput = true;
                        }
                        
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            hasModelOutput = true;
                            if (outputAudioContextRef.current) {
                                const audioContext = outputAudioContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                                const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContext.destination);
                                source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                audioSourcesRef.current.add(source);
                            }
                        }

                        if (hasUserInput) setIsListening(true);
                        if (hasModelOutput) {
                            setIsListening(false);
                            setIsModelSpeaking(true);
                        }
                        
                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(source => source.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }

                        if (message.serverContent?.turnComplete) {
                            const userInput = currentInputTranscriptionRef.current.trim();
                            const modelOutput = currentOutputTranscriptionRef.current.trim();
                            setTranscript(prev => {
                                const newTranscript = [...prev];
                                if (userInput) newTranscript.push({ speaker: 'user', text: userInput });
                                if (modelOutput) newTranscript.push({ speaker: 'model', text: modelOutput });
                                return newTranscript;
                            });
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            setIsListening(false);
                            setIsModelSpeaking(false);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        const errorMessage = (e as any).message || (e as any).error?.message || 'A connection error occurred. Please check your API key and network connection.';
                        setSessionError(errorMessage);
                        stopSession();
                    },
                    onclose: () => console.log('Session closed'),
                }
            });

        } catch (err) {
            console.error("Failed to start session:", err);
            if (err instanceof Error) {
                setSessionError(`Error: ${err.message}. Please check permissions and API Key.`);
            } else {
                setSessionError("An unknown error occurred while starting the session.");
            }
            setIsSessionActive(false);
            stopCamera();
        }
    };

    const handleFrame = useCallback(async (base64Frame: string | null) => {
        if (!base64Frame || !isSessionActive || !sessionPromiseRef.current) {
            return;
        }

        const imageBlob: Blob = {
            data: base64Frame,
            mimeType: 'image/jpeg',
        };

        sessionPromiseRef.current.then(session => {
            session.sendRealtimeInput({ media: imageBlob });
        });
    }, [isSessionActive]);
    
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        <span className="text-indigo-500">AI</span> Wardrobe Guide
                    </h1>
                    <button
                        onClick={handleToggleSession}
                        className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                            isSessionActive 
                                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' 
                                : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-400'
                        }`}
                    >
                        {isSessionActive ? <StopCircleIcon className="h-5 w-5 mr-2" /> : <CameraIcon className="h-5 w-5 mr-2" />}
                        {isSessionActive ? 'Stop Session' : 'Start Session'}
                    </button>
                </div>
            </header>
            
            {sessionError && (
                <div className="container mx-auto px-4 pt-4">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{sessionError}</span>
                    </div>
                </div>
            )}

            <main className="container mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <WebcamFeed stream={videoStream} onFrame={handleFrame} error={cameraError} />
                    </div>
                    <div className="lg:col-span-2">
                        <SuggestionBox transcript={transcript} isModelSpeaking={isModelSpeaking} isListening={isListening} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
