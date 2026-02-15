// Main App Entry Point
import { initGlobe, setGlobeClickHandler } from './globe.js';
import { initAuth, getCurrentUser } from './auth.js';
import { initBroadcastEditor } from './broadcast.js';
import { initPlayer } from './player.js';
import { initChat } from './chat.js';

// Supabase Configuration
// Users should replace these with their own Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
export let supabase;

if (typeof window !== 'undefined' && window.supabase) {
    try {
        // Check if credentials are configured
        if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
            console.warn('⚠️ Supabase credentials not configured. Please update SUPABASE_URL and SUPABASE_ANON_KEY in js/app.js');
            console.warn('The app will run in demo mode with limited functionality.');
            // Create a mock supabase client for demo purposes
            supabase = {
                auth: {
                    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
                    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
                    signOut: () => Promise.resolve({ error: null }),
                    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
                },
                from: () => ({
                    select: () => ({ data: [], error: null }),
                    insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
                    update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
                    delete: () => ({ data: null, error: { message: 'Supabase not configured' } })
                }),
                channel: () => ({
                    on: () => ({}),
                    subscribe: () => ({ unsubscribe: () => {} })
                })
            };
        } else {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
    }
}

// Global state
export const state = {
    currentUser: null,
    currentBroadcast: null,
    listeningToBroadcast: null,
    broadcasts: [],
    locationPick: { lat: 28.6139, lng: 77.2090 } // Default to Delhi
};

// Initialize the application
async function initApp() {
    console.log('🎙️ Initializing AIPR...');

    // Initialize modules
    initAuth();
    initGlobe();
    initBroadcastEditor();
    initPlayer();
    initChat();

    // Set up globe click handler for location picking
    setGlobeClickHandler((lat, lng) => {
        state.locationPick = { lat, lng };
        document.getElementById('station-lat').textContent = lat.toFixed(4);
        document.getElementById('station-lng').textContent = lng.toFixed(4);
    });

    // Load broadcasts from database
    await loadBroadcasts();

    // Set up periodic refresh for live broadcasts
    setInterval(loadBroadcasts, 10000); // Refresh every 10 seconds

    console.log('✅ AIPR initialized successfully!');
}

// Load all broadcasts from database
async function loadBroadcasts() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('broadcasts')
            .select('*')
            .eq('is_live', true);

        if (error) {
            console.error('Error loading broadcasts:', error);
            return;
        }

        state.broadcasts = data || [];
        
        // Update globe pins
        if (window.updateGlobePins) {
            window.updateGlobePins(state.broadcasts);
        }
    } catch (error) {
        console.error('Error loading broadcasts:', error);
    }
}

// Utility function to format duration
export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Utility function to parse YouTube video ID from URL
export function parseYouTubeId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for use in other modules
export { loadBroadcasts };
