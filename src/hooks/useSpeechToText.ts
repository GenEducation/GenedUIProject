import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  language?: string;
  continuous?: boolean;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = options.language || 'en-US';
    recognition.continuous = options.continuous !== undefined ? options.continuous : false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      if (options.onResult) options.onResult(currentTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (options.onEnd) options.onEnd();
    };

    recognition.onerror = (event: any) => {
      console.error('Speech Recognition Error:', event.error);
      setIsListening(false);
      if (options.onError) options.onError(event);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [options.language, options.continuous, options.onResult, options.onEnd, options.onError]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  };
}
