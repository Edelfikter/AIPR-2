// Timeline.js - Timeline editor for tracks and TTS
import { formatDuration } from './app.js';

let timelineItems = [];

// Update timeline with a new item
export function updateTimeline(item) {
    // Generate unique ID using crypto API for better uniqueness
    item.id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random();
    timelineItems.push(item);
    renderTimeline();
}

// Clear timeline
export function clearTimeline() {
    timelineItems = [];
    renderTimeline();
}

// Get timeline data
export function getTimelineData() {
    return timelineItems;
}

// Render the timeline UI
function renderTimeline() {
    const timelineContainer = document.getElementById('timeline-tracks');
    const totalDurationEl = document.getElementById('total-duration');

    if (timelineItems.length === 0) {
        timelineContainer.innerHTML = '<p style="color: #a8a052; text-align: center; padding: 20px;">No tracks or callouts added yet</p>';
        totalDurationEl.textContent = '0:00';
        return;
    }

    // Calculate total duration
    const totalDuration = timelineItems.reduce((sum, item) => sum + (item.duration || 0), 0);
    totalDurationEl.textContent = formatDuration(totalDuration);

    // Render timeline items
    timelineContainer.innerHTML = timelineItems.map((item, index) => {
        if (item.type === 'youtube') {
            return `
                <div class="timeline-item" data-index="${index}" draggable="true">
                    <div class="timeline-item-info">
                        <div class="timeline-item-title">🎵 ${item.title}</div>
                        <div class="timeline-item-duration">
                            Duration: ${formatDuration(item.duration)} | 
                            Trim: ${item.trimStart}s - ${item.trimEnd}s | 
                            Fade In: ${item.fadeIn}s | 
                            Fade Out: ${item.fadeOut}s
                        </div>
                    </div>
                    <div class="timeline-item-actions">
                        <button class="secondary-btn move-up" data-index="${index}">↑</button>
                        <button class="secondary-btn move-down" data-index="${index}">↓</button>
                        <button class="danger-btn remove" data-index="${index}">✕</button>
                    </div>
                </div>
            `;
        } else if (item.type === 'tts') {
            return `
                <div class="timeline-item tts" data-index="${index}" draggable="true">
                    <div class="timeline-item-info">
                        <div class="timeline-item-title">🎙️ TTS: "${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}"</div>
                        <div class="timeline-item-duration">
                            Duration: ${formatDuration(item.duration)} | 
                            Reverb: ${item.reverb}
                        </div>
                    </div>
                    <div class="timeline-item-actions">
                        <button class="secondary-btn move-up" data-index="${index}">↑</button>
                        <button class="secondary-btn move-down" data-index="${index}">↓</button>
                        <button class="danger-btn remove" data-index="${index}">✕</button>
                    </div>
                </div>
            `;
        }
    }).join('');

    // Attach event listeners
    attachTimelineEventListeners();
}

// Attach event listeners to timeline items
function attachTimelineEventListeners() {
    // Move up buttons
    document.querySelectorAll('.timeline-item .move-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            moveItem(index, -1);
        });
    });

    // Move down buttons
    document.querySelectorAll('.timeline-item .move-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            moveItem(index, 1);
        });
    });

    // Remove buttons
    document.querySelectorAll('.timeline-item .remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeItem(index);
        });
    });

    // Drag and drop
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

// Move item up or down
function moveItem(index, direction) {
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= timelineItems.length) {
        return; // Can't move out of bounds
    }

    // Swap items
    const temp = timelineItems[index];
    timelineItems[index] = timelineItems[newIndex];
    timelineItems[newIndex] = temp;

    renderTimeline();
}

// Remove item
function removeItem(index) {
    timelineItems.splice(index, 1);
    renderTimeline();
}

// Drag and drop handlers
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(e.target.dataset.index);
    e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDrop(e) {
    e.preventDefault();
    
    const dropIndex = parseInt(e.target.closest('.timeline-item').dataset.index);
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        // Reorder items
        const draggedItem = timelineItems[draggedIndex];
        timelineItems.splice(draggedIndex, 1);
        timelineItems.splice(dropIndex, 0, draggedItem);
        renderTimeline();
    }

    return false;
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedIndex = null;
}
