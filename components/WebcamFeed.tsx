
import React, { useRef, useEffect } from 'react';
import { CameraIcon } from './Icons';

interface WebcamFeedProps {
    stream: MediaStream | null;
    onFrame: (base64Frame: string | null) => void;
    error: string | null;
}

const FRAME_CAPTURE_INTERVAL = 1000; // 1 second

export const WebcamFeed: React.FC<WebcamFeedProps> = ({ stream, onFrame, error }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        let intervalId: number | null = null;
        if (stream && videoRef.current && canvasRef.current) {
            const videoElement = videoRef.current;
            const canvasElement = canvasRef.current;
            const context = canvasElement.getContext('2d');

            intervalId = window.setInterval(() => {
                if (context && videoElement.readyState === 4) { // HAVE_ENOUGH_DATA
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
                    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
                    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
                    const base64Data = dataUrl.split(',')[1];
                    onFrame(base64Data);
                }
            }, FRAME_CAPTURE_INTERVAL);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [stream, onFrame]);

    return (
        <div className="relative w-full aspect-[3/4] bg-gray-900 flex items-center justify-center">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 ${stream ? 'opacity-100' : 'opacity-0'}`}
            />
             <canvas ref={canvasRef} className="hidden" />
            {!stream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-400 p-4">
                    <CameraIcon className="h-16 w-16 mb-4 text-gray-500" />
                    <h2 className="text-xl font-semibold text-white">Camera is Off</h2>
                    <p className="mt-2 max-w-xs">
                        {error 
                            ? `Error: ${error}`
                            : "Click 'Start Session' to begin your style analysis."
                        }
                    </p>
                </div>
            )}
        </div>
    );
};
