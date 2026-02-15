// TTS.js - SAM TTS integration with radio filter
// Note: sam-js library is loaded via CDN in index.html

// Audio context for Web Audio API
let audioContext;

// Initialize audio context
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Generate TTS with SAM and apply radio filter
export async function generateTTS(text, reverbIntensity = 'medium', previewOnly = false) {
    try {
        // Check if sam-js is loaded
        if (typeof SamJs === 'undefined') {
            console.error('sam-js library not loaded');
            alert('TTS library not loaded. Please refresh the page.');
            return null;
        }

        // Create SAM instance
        const sam = new SamJs();
        
        // Configure SAM settings for classic Microsoft SAM voice
        sam.SetSpeed(72); // Speech speed (50-255, default 72)
        sam.SetPitch(64); // Voice pitch (0-255, default 64)
        sam.SetThroat(128); // Throat sound (0-255, default 128)
        sam.SetMouth(128); // Mouth shape (0-255, default 128)

        // Generate raw audio buffer
        const buf8 = sam.buf8;
        sam.Speak(text);

        if (!buf8 || buf8.length === 0) {
            throw new Error('Failed to generate speech');
        }

        // Convert to proper audio format
        const audioData = await applyRadioFilter(buf8, reverbIntensity);

        if (previewOnly) {
            // Play preview
            playAudioBuffer(audioData.buffer);
            return null;
        }

        // Return audio data for timeline
        return {
            url: audioData.url,
            duration: audioData.duration
        };
    } catch (error) {
        console.error('Error generating TTS:', error);
        alert('Error generating TTS: ' + error.message);
        return null;
    }
}

// Apply radio filter effects using Web Audio API
async function applyRadioFilter(samBuffer, reverbIntensity) {
    const ctx = getAudioContext();

    // Convert SAM buffer to AudioBuffer
    // SAM outputs 8-bit unsigned PCM at 22050 Hz
    const sampleRate = 22050;
    const audioBuffer = ctx.createBuffer(1, samBuffer.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Convert 8-bit unsigned to float
    for (let i = 0; i < samBuffer.length; i++) {
        channelData[i] = (samBuffer[i] - 128) / 128.0;
    }

    // Create offline context for processing
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, sampleRate);

    // Create source
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Create filter chain for radio effect

    // 1. Bandpass filter (simulates AM radio frequency range)
    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000; // Cut highs above 3kHz

    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 300; // Cut lows below 300Hz

    // 2. Bit crusher effect (digital artifacts)
    const waveshaper = offlineCtx.createWaveShaper();
    waveshaper.curve = makeBitCrusherCurve(8); // 8-bit crush
    waveshaper.oversample = 'none';

    // 3. Reverb (radio booth echo)
    const convolver = offlineCtx.createConvolver();
    convolver.buffer = createReverbImpulse(offlineCtx, reverbIntensity);

    // 4. Dry/Wet mix for reverb
    const dryGain = offlineCtx.createGain();
    const wetGain = offlineCtx.createGain();

    const reverbMix = getReverbMix(reverbIntensity);
    dryGain.gain.value = 1 - reverbMix;
    wetGain.gain.value = reverbMix;

    // Connect nodes
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(waveshaper);

    // Split for dry/wet
    waveshaper.connect(dryGain);
    waveshaper.connect(convolver);
    convolver.connect(wetGain);

    // Mix and output
    dryGain.connect(offlineCtx.destination);
    wetGain.connect(offlineCtx.destination);

    // Start processing
    source.start(0);

    // Render
    const renderedBuffer = await offlineCtx.startRendering();

    // Convert to blob URL
    const audioBlob = await audioBufferToBlob(renderedBuffer);
    const url = URL.createObjectURL(audioBlob);

    return {
        buffer: renderedBuffer,
        url: url,
        duration: renderedBuffer.duration
    };
}

// Create bit crusher curve
function makeBitCrusherCurve(bits) {
    const samples = 256;
    const curve = new Float32Array(samples);
    const step = Math.pow(0.5, bits);

    for (let i = 0; i < samples; i++) {
        const x = (i / samples) * 2 - 1;
        curve[i] = Math.round(x / step) * step;
    }

    return curve;
}

// Create reverb impulse response
function createReverbImpulse(context, intensity) {
    const sampleRate = context.sampleRate;
    let length, decay;

    switch (intensity) {
        case 'subtle':
            length = sampleRate * 0.5; // 0.5 seconds
            decay = 2;
            break;
        case 'heavy':
            length = sampleRate * 2; // 2 seconds
            decay = 4;
            break;
        case 'medium':
        default:
            length = sampleRate * 1; // 1 second
            decay = 3;
            break;
    }

    const impulse = context.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = length - i;
        left[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
    }

    return impulse;
}

// Get reverb mix ratio
function getReverbMix(intensity) {
    switch (intensity) {
        case 'subtle':
            return 0.1;
        case 'heavy':
            return 0.4;
        case 'medium':
        default:
            return 0.2;
    }
}

// Convert AudioBuffer to Blob
async function audioBufferToBlob(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Audio data
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Play audio buffer for preview
function playAudioBuffer(buffer) {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
}
