// Broadcast.js - Broadcast editor logic
import { supabase, state, parseYouTubeId } from './app.js';
import { updateTimeline, getTimelineData, clearTimeline } from './timeline.js';
import { generateTTS } from './tts.js';

let currentTrackData = null;

// Initialize broadcast editor
export function initBroadcastEditor() {
    const createBtn = document.getElementById('create-broadcast-btn');
    const editorModal = document.getElementById('broadcast-editor');
    const closeEditor = document.getElementById('close-editor');

    // Open editor
    createBtn.addEventListener('click', () => {
        editorModal.style.display = 'flex';
        clearTimeline();
    });

    // Close editor
    closeEditor.addEventListener('click', () => {
        editorModal.style.display = 'none';
    });

    editorModal.addEventListener('click', (e) => {
        if (e.target === editorModal) {
            editorModal.style.display = 'none';
        }
    });

    // YouTube track handlers
    setupTrackHandlers();

    // TTS handlers
    setupTTSHandlers();

    // Go Live button
    document.getElementById('go-live-btn').addEventListener('click', handleGoLive);

    console.log('📡 Broadcast editor initialized');
}

// Set up YouTube track handlers
function setupTrackHandlers() {
    const addTrackBtn = document.getElementById('add-track-btn');
    const youtubeUrlInput = document.getElementById('youtube-url');
    const trackPreview = document.getElementById('track-preview');
    const confirmTrackBtn = document.getElementById('confirm-track-btn');

    // Fade in/out sliders
    const fadeInSlider = document.getElementById('fade-in');
    const fadeOutSlider = document.getElementById('fade-out');
    const fadeInVal = document.getElementById('fade-in-val');
    const fadeOutVal = document.getElementById('fade-out-val');

    fadeInSlider.addEventListener('input', (e) => {
        fadeInVal.textContent = `${e.target.value}s`;
    });

    fadeOutSlider.addEventListener('input', (e) => {
        fadeOutVal.textContent = `${e.target.value}s`;
    });

    addTrackBtn.addEventListener('click', async () => {
        const url = youtubeUrlInput.value.trim();
        if (!url) {
            alert('Please enter a YouTube URL');
            return;
        }

        const videoId = parseYouTubeId(url);
        if (!videoId) {
            alert('Invalid YouTube URL');
            return;
        }

        // Get video info using YouTube API
        await loadVideoPreview(videoId);
    });

    confirmTrackBtn.addEventListener('click', () => {
        if (!currentTrackData) return;

        const trimStart = parseInt(document.getElementById('trim-start').value) || 0;
        const trimEnd = parseInt(document.getElementById('trim-end').value) || currentTrackData.duration;
        const fadeIn = parseFloat(document.getElementById('fade-in').value) || 0;
        const fadeOut = parseFloat(document.getElementById('fade-out').value) || 0;

        const trackItem = {
            type: 'youtube',
            videoId: currentTrackData.videoId,
            title: currentTrackData.title,
            thumbnail: currentTrackData.thumbnail,
            trimStart,
            trimEnd,
            fadeIn,
            fadeOut,
            duration: trimEnd - trimStart
        };

        updateTimeline(trackItem);

        // Reset form
        trackPreview.style.display = 'none';
        youtubeUrlInput.value = '';
        document.getElementById('trim-start').value = '0';
        document.getElementById('trim-end').value = '0';
        document.getElementById('fade-in').value = '0';
        document.getElementById('fade-out').value = '0';
        fadeInVal.textContent = '0s';
        fadeOutVal.textContent = '0s';
        currentTrackData = null;
    });
}

// Load YouTube video preview
async function loadVideoPreview(videoId) {
    try {
        // Use YouTube IFrame API to get video info
        // For now, we'll create a simple preview
        const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        currentTrackData = {
            videoId,
            title: `YouTube Video ${videoId}`,
            thumbnail,
            duration: 180 // Default 3 minutes, will be updated when video loads
        };

        const trackPreview = document.getElementById('track-preview');
        const trackThumbnail = document.getElementById('track-thumbnail');

        trackThumbnail.innerHTML = `
            <img src="${thumbnail}" alt="Video Thumbnail">
            <p><strong>${currentTrackData.title}</strong></p>
        `;

        // Set trim end to full duration
        document.getElementById('trim-end').value = currentTrackData.duration;

        trackPreview.style.display = 'block';
    } catch (error) {
        console.error('Error loading video preview:', error);
        alert('Error loading video preview');
    }
}

// Set up TTS handlers
function setupTTSHandlers() {
    const previewBtn = document.getElementById('preview-tts-btn');
    const addTtsBtn = document.getElementById('add-tts-btn');
    const ttsTextArea = document.getElementById('tts-text');
    const reverbIntensity = document.getElementById('reverb-intensity');

    previewBtn.addEventListener('click', async () => {
        const text = ttsTextArea.value.trim();
        if (!text) {
            alert('Please enter text for TTS');
            return;
        }

        const reverb = reverbIntensity.value;
        await generateTTS(text, reverb, true); // true = preview only
    });

    addTtsBtn.addEventListener('click', async () => {
        const text = ttsTextArea.value.trim();
        if (!text) {
            alert('Please enter text for TTS');
            return;
        }

        const reverb = reverbIntensity.value;

        // Generate TTS audio
        const audioData = await generateTTS(text, reverb, false);

        if (audioData) {
            const ttsItem = {
                type: 'tts',
                text,
                reverb,
                duration: audioData.duration,
                audioUrl: audioData.url
            };

            updateTimeline(ttsItem);

            // Reset form
            ttsTextArea.value = '';
        }
    });
}

// Handle going live
async function handleGoLive() {
    if (!state.currentUser) {
        alert('Please sign in to create a broadcast');
        return;
    }

    const stationName = document.getElementById('station-name').value.trim();
    const stationDescription = document.getElementById('station-description').value.trim();
    const isLooping = document.getElementById('loop-broadcast').checked;
    const scheduledTime = document.getElementById('scheduled-time').value;

    if (!stationName) {
        alert('Please enter a station name');
        return;
    }

    const timelineData = getTimelineData();
    if (timelineData.length === 0) {
        alert('Please add at least one track or TTS callout to your broadcast');
        return;
    }

    const { lat, lng } = state.locationPick;

    try {
        // Create broadcast in database
        if (!supabase) {
            console.error('Supabase not configured');
            alert('Database not configured. Please set up Supabase to create broadcasts.');
            return;
        }

        const broadcastData = {
            user_id: state.currentUser.id,
            name: stationName,
            description: stationDescription,
            is_live: !scheduledTime, // Go live immediately if no schedule
            is_looping: isLooping,
            scheduled_at: scheduledTime || null,
            started_at: scheduledTime ? null : new Date().toISOString(),
            timeline_data: timelineData,
            lat,
            lng
        };

        const { data, error } = await supabase
            .from('broadcasts')
            .insert([broadcastData])
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Broadcast created:', data);

        // Store current broadcast
        state.currentBroadcast = data;

        // Close editor and show mini player
        document.getElementById('broadcast-editor').style.display = 'none';
        showMiniPlayer(data);

        // Update globe
        if (window.updateGlobePins && window.loadBroadcasts) {
            await window.loadBroadcasts();
        }

        alert('🎉 Your broadcast is now live!');
    } catch (error) {
        console.error('Error creating broadcast:', error);
        alert('Error creating broadcast: ' + error.message);
    }
}

// Show mini player when broadcasting
function showMiniPlayer(broadcast) {
    const miniPlayer = document.getElementById('mini-player');
    const miniStationName = document.getElementById('mini-station-name');
    const stopBtn = document.getElementById('stop-broadcast-btn');

    miniStationName.textContent = broadcast.name;
    miniPlayer.style.display = 'block';

    // Set up stop button
    stopBtn.onclick = async () => {
        await stopBroadcast(broadcast.id);
    };

    // Start playback in mini player
    if (window.startBroadcastPlayback) {
        window.startBroadcastPlayback(broadcast);
    }
}

// Stop broadcasting
async function stopBroadcast(broadcastId) {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('broadcasts')
            .update({ is_live: false })
            .eq('id', broadcastId);

        if (error) throw error;

        // Hide mini player
        document.getElementById('mini-player').style.display = 'none';

        // Stop playback
        if (window.stopBroadcastPlayback) {
            window.stopBroadcastPlayback();
        }

        state.currentBroadcast = null;

        // Update globe
        if (window.loadBroadcasts) {
            await window.loadBroadcasts();
        }

        console.log('🛑 Broadcast stopped');
    } catch (error) {
        console.error('Error stopping broadcast:', error);
    }
}
