import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, XMarkIcon } from './icons';

interface VoiceInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (transcript: string) => void;
}

const VoiceInputModal = ({ isOpen, onClose, onComplete }: VoiceInputModalProps) => {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const stopListeningAndCleanup = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (animationFrameRef.current != null) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        sourceRef.current?.disconnect();
        if (audioContextRef.current?.state !== 'closed') {
           audioContextRef.current?.close().catch(e => console.error("Error closing AudioContext:", e));
        }

        streamRef.current = null;
        sourceRef.current = null;
        analyserRef.current = null;
        audioContextRef.current = null;
        recognitionRef.current = null;
        setIsListening(false);
    };

    const draw = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;

        const canvasCtx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawFrame = () => {
            animationFrameRef.current = requestAnimationFrame(drawFrame);
            analyser.getByteTimeDomainData(dataArray);

            if (canvasCtx) {
                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = 'hsl(var(--color-primary))';
                canvasCtx.beginPath();
                
                const sliceWidth = canvas.width * 1.0 / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * canvas.height / 2;
                    if (i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                canvasCtx.lineTo(canvas.width, canvas.height / 2);
                canvasCtx.stroke();
            }
        };
        drawFrame();
    };


    const startListening = async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported by your browser.");
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        let finalTranscript = '';
        
        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            finalTranscript = ''; // Reset final transcript to rebuild
            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(finalTranscript.trim() + ' ' + interimTranscript.trim());
        };

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            if (event.error === 'network') {
                setError("Network error. Please check your internet connection and try again.");
            } else if (event.error === 'no-speech') {
                setError("No speech was detected. Please try again.");
            } else if (event.error === 'audio-capture') {
                setError("Microphone error. Please ensure it's connected and permissions are granted.");
            } else {
                setError("An unknown error occurred during speech recognition.");
            }
            setIsListening(false);
        };
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
            
            analyserRef.current = audioContext.createAnalyser();
            analyserRef.current.fftSize = 2048;

            sourceRef.current = audioContext.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);

            draw();
            recognition.start();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access the microphone. Please grant permission and try again.");
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            setTranscript('');
            setError(null);
            startListening();
        } else {
            stopListeningAndCleanup();
        }
        return () => {
             // Safety net cleanup when component unmounts
             stopListeningAndCleanup();
        };
    }, [isOpen]);

    const handleComplete = () => {
        onComplete(transcript.trim());
    };

    const getStatusText = () => {
        if (error) {
            return <span className="text-red-500">{error}</span>;
        }
        if (isListening && !transcript) {
            return 'Listening...';
        }
        if (transcript) {
            return transcript;
        }
        return 'Please speak into your microphone.';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-center items-center backdrop-blur-md animate-fade-in-overlay" onMouseDown={onClose}>
            <div className="bg-page dark:bg-page-dark rounded-2xl w-full max-w-2xl p-8 flex flex-col items-center gap-8 relative animate-scale-in" onMouseDown={e => e.stopPropagation()}>
                <button onMouseDown={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-200 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}>
                    <MicrophoneIcon className="w-16 h-16 text-white" />
                </div>

                <div className="w-full h-24">
                    <canvas ref={canvasRef} width="600" height="100" className="w-full h-full"></canvas>
                </div>

                <p className="min-h-[56px] text-xl text-center text-gray-800 dark:text-gray-100">{getStatusText()}</p>

                <div className="flex items-center gap-4">
                    <button onMouseDown={onClose} className="px-6 py-3 text-sm font-semibold rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">
                        Cancel
                    </button>
                    <button onMouseDown={handleComplete} disabled={!transcript.trim() || !!error} className="px-6 py-3 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50">
                        Insert Text
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceInputModal;
