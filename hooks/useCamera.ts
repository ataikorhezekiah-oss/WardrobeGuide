
import { useState, useCallback, useRef } from 'react';

export const useCamera = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            if (streamRef.current) {
                return;
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                }
            });
            streamRef.current = mediaStream;
            setStream(mediaStream);
            setError(null);
        } catch (err) {
            console.error("Error accessing camera:", err);
            if (err instanceof Error) {
                if(err.name === "NotAllowedError") {
                    setError("Camera permission denied. Please enable it in your browser settings.");
                } else {
                    setError(`Could not start camera: ${err.message}`);
                }
            } else {
                setError("An unknown error occurred while accessing the camera.");
            }
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    return { stream, error, startCamera, stopCamera };
};
