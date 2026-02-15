// Globe.js - 3D Globe setup and pin management
import { state } from './app.js';

let globe;
let globeClickHandler = null;

// Pin data for rendering
let pins = [];

// Initialize the 3D globe
export function initGlobe() {
    const container = document.getElementById('globe-container');

    // Create Globe instance
    globe = Globe()
        (container)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundColor('rgba(10,22,18,1)')
        .pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 2.5 }) // Focus on India
        .showAtmosphere(true)
        .atmosphereColor('rgba(46, 204, 113, 0.3)')
        .atmosphereAltitude(0.15);

    // Set up custom point rendering for pins
    globe
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointAltitude(0.01)
        .pointRadius(0.5)
        .pointColor(d => d.isOwn ? '#2ecc71' : d.isLive ? '#e67e4a' : '#6b8cce')
        .pointLabel(d => `
            <div style="background: rgba(10,22,18,0.95); padding: 10px; border-radius: 5px; border: 1px solid #2ecc71;">
                <strong style="color: #2ecc71;">${d.name}</strong><br/>
                ${d.description ? `<span style="color: #e0e0e0; font-size: 12px;">${d.description}</span><br/>` : ''}
                <span style="color: #a8a052; font-size: 11px;">👥 ${d.listeners || 0} listening</span>
            </div>
        `)
        .onPointClick(handlePinClick)
        .onPointHover(handlePinHover);

    // Set up globe click handler for location picking
    globe.onGlobeClick(coords => {
        if (globeClickHandler) {
            globeClickHandler(coords.lat, coords.lng);
        }
    });

    // Add ambient animation
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.3;
    globe.controls().enableZoom = true;

    // Handle window resize
    window.addEventListener('resize', () => {
        globe.width(window.innerWidth);
        globe.height(window.innerHeight);
    });

    console.log('🌍 Globe initialized');
}

// Update pins on the globe based on broadcast data
export function updateGlobePins(broadcasts) {
    pins = broadcasts.map(broadcast => ({
        id: broadcast.id,
        lat: broadcast.lat,
        lng: broadcast.lng,
        name: broadcast.name,
        description: broadcast.description,
        isLive: broadcast.is_live,
        isOwn: state.currentUser && broadcast.user_id === state.currentUser.id,
        listeners: 0, // Listener count will be tracked via listeners table in production
        broadcast: broadcast
    }));

    if (globe) {
        globe.pointsData(pins);
    }
}

// Handle pin click
function handlePinClick(pin) {
    if (!pin) return;

    console.log('Pin clicked:', pin);

    // Show station info panel
    const stationInfo = document.getElementById('station-info');
    const infoName = document.getElementById('info-station-name');
    const infoDescription = document.getElementById('info-station-description');
    const infoCurrentTrack = document.getElementById('info-current-track');
    const infoListeners = document.getElementById('info-listeners');
    const tuneInBtn = document.getElementById('tune-in-btn');

    infoName.textContent = pin.name;
    infoDescription.textContent = pin.description || 'No description';
    infoCurrentTrack.textContent = 'Loading...';
    infoListeners.textContent = pin.listeners || 0;

    // Store the selected broadcast
    state.selectedBroadcast = pin.broadcast;

    stationInfo.style.display = 'block';

    // Set up tune in button
    tuneInBtn.onclick = () => {
        if (window.tuneInToBroadcast) {
            window.tuneInToBroadcast(pin.broadcast);
        }
    };
}

// Handle pin hover for parallax effect
function handlePinHover(pin) {
    // Add visual feedback - this can be enhanced with custom WebGL materials
    if (pin) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
    }
}

// Set a custom click handler for the globe (used for location picking)
export function setGlobeClickHandler(handler) {
    globeClickHandler = handler;
}

// Add a new pin to the globe
export function addPin(lat, lng, data) {
    pins.push({
        lat,
        lng,
        ...data
    });
    
    if (globe) {
        globe.pointsData(pins);
    }
}

// Remove a pin from the globe
export function removePin(id) {
    pins = pins.filter(pin => pin.id !== id);
    
    if (globe) {
        globe.pointsData(pins);
    }
}

// Animate camera to a specific location
export function focusOnLocation(lat, lng, altitude = 2) {
    if (globe) {
        globe.pointOfView({ lat, lng, altitude }, 1000); // 1 second animation
    }
}

// Make update function available globally for app.js
if (typeof window !== 'undefined') {
    window.updateGlobePins = updateGlobePins;
}
