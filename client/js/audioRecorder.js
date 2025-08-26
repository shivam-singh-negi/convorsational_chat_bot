class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioContext = null;
        this.stream = null;
        this.isRecording = false;
        this.audioChunks = [];
        this.processor = null;
        this.analyser = null;
        this.dataArray = null;
        this.onAudioDataCallback = null;
    }

    async initialize() {
        try {
            console.log('Initializing audio recorder...');
            
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            
            // Resume audio context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            console.log('Audio recorder initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing audio:', error);
            this.handleAudioError(error);
            return false;
        }
    }

    startRecording(onAudioData) {
        if (this.isRecording) {
            console.warn('Recording already in progress');
            return false;
        }

        try {
            console.log('Starting audio recording...');
            this.onAudioDataCallback = onAudioData;
            
            const source = this.audioContext.createMediaStreamSource(this.stream);
            
            // Create analyser for audio visualization
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            // Create script processor for real-time audio processing
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            this.processor.onaudioprocess = (event) => {
                if (!this.isRecording) return;
                
                const inputData = event.inputBuffer.getChannelData(0);
                
                // Convert float32 to int16 PCM
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const sample = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                }
                
                // Convert to base64 for transmission
                const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
                
                if (this.onAudioDataCallback) {
                    this.onAudioDataCallback(base64Audio);
                }
            };
            
            // Connect audio nodes
            source.connect(this.analyser);
            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            this.isRecording = true;
            console.log('Audio recording started successfully');
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            this.handleAudioError(error);
            return false;
        }
    }

    stopRecording() {
        if (!this.isRecording) {
            return false;
        }
        
        console.log('Stopping audio recording...');
        this.isRecording = false;
        
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        this.onAudioDataCallback = null;
        console.log('Audio recording stopped');
        return true;
    }

    // Get audio visualization data
    getVisualizationData() {
        if (!this.analyser || !this.dataArray) {
            return new Array(5).fill(0);
        }
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Convert to 5 bars for visualization
        const barCount = 5;
        const barSize = Math.floor(this.dataArray.length / barCount);
        const bars = [];
        
        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            for (let j = 0; j < barSize; j++) {
                sum += this.dataArray[i * barSize + j];
            }
            bars.push(sum / barSize / 255); // Normalize to 0-1
        }
        
        return bars;
    }

    arrayBufferToBase64(buffer) {
        try {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        } catch (error) {
            console.error('Error converting audio to base64:', error);
            return '';
        }
    }

    async playAudioFromBase64(base64Audio, mimeType = 'audio/wav') {
        try {
            console.log('Playing audio response...');
            
            if (!base64Audio) {
                console.warn('No audio data provided');
                return;
            }

            // For demo purposes, we'll use speech synthesis instead of trying to decode the base64 audio
            // In a real implementation, you would decode and play the actual audio
            return new Promise((resolve) => {
                const utterance = new SpeechSynthesisUtterance();
                utterance.text = "This is a simulated audio response from Rev about Revolt Motors.";
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                
                utterance.onend = () => {
                    console.log('Audio playback completed');
                    resolve();
                };
                
                utterance.onerror = (error) => {
                    console.error('Speech synthesis error:', error);
                    resolve();
                };
                
                window.speechSynthesis.speak(utterance);
            });
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    }

    // Play text using speech synthesis (fallback)
    async speakText(text) {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) {
                console.error('Speech synthesis not supported');
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Try to use a more natural voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.lang.includes('en') && voice.name.includes('Google')
            ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            utterance.onend = resolve;
            utterance.onerror = resolve;
            
            window.speechSynthesis.speak(utterance);
        });
    }

    // Stop any currently playing speech
    stopSpeaking() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    handleAudioError(error) {
        let errorMessage = 'Audio error occurred';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone access denied. Please allow microphone permissions and refresh the page.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and refresh the page.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = 'Microphone is already in use by another application.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage = 'Microphone does not meet the required constraints.';
        }
        
        console.error('Audio error:', errorMessage, error);
        
        // Dispatch custom error event
        window.dispatchEvent(new CustomEvent('audioError', {
            detail: { message: errorMessage, originalError: error }
        }));
    }

    cleanup() {
        console.log('Cleaning up audio recorder...');
        
        this.stopRecording();
        this.stopSpeaking();
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                console.log('Audio track stopped');
            });
            this.stream = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            console.log('Audio context closed');
        }
        
        this.audioContext = null;
        this.mediaRecorder = null;
        this.processor = null;
        this.analyser = null;
        this.dataArray = null;
    }

    // Check if audio is supported
    static isSupported() {
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getUserMedia && 
                 (window.AudioContext || window.webkitAudioContext));
    }

    // Get audio device info
    async getAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'audioinput');
        } catch (error) {
            console.error('Error getting audio devices:', error);
            return [];
        }
    }
}