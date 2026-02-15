// Player.js - Live player and synchronized playback logic
import { supabase, state, formatDuration } from './app.js';

let currentPlayer = null;
let currentBroadcastId = null;
let playbackInterval = null;
let youtubePlayer = null;
let ttsAudioElement = null;

// YouTube API ready flag
let youtubeReady = false;

// Initialize player
export function initPlayer() {
    // Set up station info panel handlers
    const closeStationInfo = document.getElementById('close-station-info');
    closeStationInfo.addEventListener('click', () => {
        document.getElementById('station-info').style.display = 'none';
    });

    const stopListeningBtn = document.getElementById('stop-listening-btn');
    stopListeningBtn.addEventListener('click', stopListening);

    // Wait for YouTube API to be ready
    if (window.YT && window.YT.Player) {
        youtubeReady = true;
    } else {
        window.onYouTubeIframeAPIReady = () => {
            youtubeReady = true;
            console.log('✅ YouTube IFrame API ready');
        };
    }

    // Make tune in function available globally
    window.tuneInToBroadcast = tuneInToBroadcast;
    window.startBroadcastPlayback = startBroadcastPlayback;
    window.stopBroadcastPlayback = stopBroadcastPlayback;

    console.log('▶️ Player initialized');
}

// Tune in to a broadcast
function tuneInToBroadcast(broadcast) {
    if (state.listeningToBroadcast === broadcast.id) {
        console.log('Already tuned in to this broadcast');
        return;
    }

    // Stop current playback if any
    if (state.listeningToBroadcast) {
        stopListening();
    }

    console.log('🎧 Tuning in to:', broadcast.name);

    state.listeningToBroadcast = broadcast.id;

    // Update UI
    document.getElementById('tune-in-btn').style.display = 'none';
    document.getElementById('stop-listening-btn').style.display = 'block';

    // Start synchronized playback
    startSyncedPlayback(broadcast);
}

// Stop listening to current broadcast
function stopListening() {
    console.log('🛑 Stopped listening');

    state.listeningToBroadcast = null;

    // Update UI
    document.getElementById('tune-in-btn').style.display = 'block';
    document.getElementById('stop-listening-btn').style.display = 'none';

    // Stop playback
    stopPlayback();
}

// Start synchronized playback
function startSyncedPlayback(broadcast) {
    if (!broadcast.timeline_data || broadcast.timeline_data.length === 0) {
        console.error('No timeline data for broadcast');
        return;
    }

    const startTime = new Date(broadcast.started_at).getTime();
    const currentTime = Date.now();
    const elapsed = (currentTime - startTime) / 1000; // seconds

    // Calculate total duration
    const totalDuration = broadcast.timeline_data.reduce((sum, item) => sum + item.duration, 0);

    // Calculate position in timeline
    let position = elapsed;
    if (broadcast.is_looping) {
        position = position % totalDuration;
    } else if (position >= totalDuration) {
        console.log('Broadcast has ended');
        return;
    }

    // Find the current item and offset
    let currentOffset = 0;
    let currentItem = null;
    let itemStartTime = 0;

    for (const item of broadcast.timeline_data) {
        if (position < currentOffset + item.duration) {
            currentItem = item;
            itemStartTime = position - currentOffset;
            break;
        }
        currentOffset += item.duration;
    }

    if (!currentItem) {
        console.error('Could not find current item in timeline');
        return;
    }

    console.log('📻 Playing from:', currentItem, 'at offset:', itemStartTime);

    // Play the current item
    playItem(currentItem, itemStartTime, broadcast);

    // Update info panel
    updateNowPlaying(currentItem);
}

// Play a timeline item
function playItem(item, startOffset, broadcast) {
    stopPlayback(); // Stop any current playback

    if (item.type === 'youtube') {
        playYouTubeTrack(item, startOffset, broadcast);
    } else if (item.type === 'tts') {
        playTTSTrack(item, startOffset, broadcast);
    }
}

// Play YouTube track
function playYouTubeTrack(item, startOffset, broadcast) {
    if (!youtubeReady) {
        console.error('YouTube API not ready');
        setTimeout(() => playYouTubeTrack(item, startOffset, broadcast), 500);
        return;
    }

    // Create player container if it doesn't exist
    let playerContainer = document.getElementById('youtube-player-container');
    if (!playerContainer) {
        playerContainer = document.createElement('div');
        playerContainer.id = 'youtube-player-container';
        playerContainer.style.display = 'none';
        document.body.appendChild(playerContainer);
    }

    // Create YouTube player
    youtubePlayer = new YT.Player('youtube-player-container', {
        videoId: item.videoId,
        playerVars: {
            autoplay: 1,
            controls: 0,
            start: Math.floor(item.trimStart + startOffset)
        },
        events: {
            onReady: (event) => {
                event.target.setVolume(100);
                event.target.playVideo();
            },
            onStateChange: (event) => {
                // Check if video ended
                if (event.data === YT.PlayerState.ENDED) {
                    handleItemEnded(broadcast);
                }
            }
        }
    });

    // Set up progress monitoring
    startProgressMonitoring(item, startOffset);
}

// Play TTS track
function playTTSTrack(item, startOffset, broadcast) {
    if (!item.audioUrl) {
        console.error('No audio URL for TTS item');
        handleItemEnded(broadcast);
        return;
    }

    // Create or reuse audio element
    if (!ttsAudioElement) {
        ttsAudioElement = new Audio();
    }

    ttsAudioElement.src = item.audioUrl;
    ttsAudioElement.currentTime = startOffset;
    
    ttsAudioElement.play().catch(error => {
        console.error('Error playing TTS:', error);
    });

    ttsAudioElement.onended = () => {
        handleItemEnded(broadcast);
    };

    // Set up progress monitoring
    startProgressMonitoring(item, startOffset);
}

// Handle item ended - move to next item
function handleItemEnded(broadcast) {
    // In a real implementation, this would continue to the next item
    // For now, we restart the synced playback
    console.log('Item ended, resyncing...');
    setTimeout(() => {
        if (state.listeningToBroadcast === broadcast.id) {
            startSyncedPlayback(broadcast);
        }
    }, 100);
}

// Start progress monitoring
function startProgressMonitoring(item, startOffset) {
    let currentTime = startOffset;
    // 250ms provides smooth visual updates while reducing CPU usage by 60% compared to 100ms
    // Trade-off: Slightly less smooth progress bar vs better performance, especially with multiple listeners
    const updateInterval = 250;

    playbackInterval = setInterval(() => {
        currentTime += (updateInterval / 1000);

        // Update mini player or info panel progress
        const progress = (currentTime / item.duration) * 100;
        updateProgress(progress);

        if (currentTime >= item.duration) {
            clearInterval(playbackInterval);
        }
    }, updateInterval);
}

// Update progress bar
function updateProgress(percentage) {
    const progressBar = document.getElementById('mini-progress-fill');
    if (progressBar) {
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
    }
}

// Update now playing info
function updateNowPlaying(item) {
    const infoCurrentTrack = document.getElementById('info-current-track');
    const miniCurrentTrack = document.getElementById('mini-current-track');

    let trackInfo = '';
    if (item.type === 'youtube') {
        trackInfo = `🎵 ${item.title}`;
    } else if (item.type === 'tts') {
        trackInfo = `🎙️ ${item.text.substring(0, 50)}...`;
    }

    if (infoCurrentTrack) {
        infoCurrentTrack.textContent = trackInfo;
    }
    if (miniCurrentTrack) {
        miniCurrentTrack.textContent = trackInfo;
    }
}

// Stop playback
function stopPlayback() {
    // Stop YouTube player
    if (youtubePlayer) {
        try {
            youtubePlayer.stopVideo();
            youtubePlayer.destroy();
        } catch (error) {
            console.debug('Error stopping YouTube player:', error);
        }
        youtubePlayer = null;
    }

    // Stop TTS audio
    if (ttsAudioElement) {
        ttsAudioElement.pause();
        ttsAudioElement.src = '';
    }

    // Clear intervals
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
}

// Start broadcast playback (for broadcaster's own mini player)
function startBroadcastPlayback(broadcast) {
    currentBroadcastId = broadcast.id;
    startSyncedPlayback(broadcast);
}

// Stop broadcast playback
function stopBroadcastPlayback() {
    stopPlayback();
    currentBroadcastId = null;
}
