// Chat.js - Global chat functionality
import { supabase, state } from './app.js';

let chatChannel = null;
let isAnonymous = true;

// Initialize chat
export function initChat() {
    setupChatUI();
    connectToChat();

    console.log('💬 Chat initialized');
}

// Set up chat UI handlers
function setupChatUI() {
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const toggleChatBtn = document.getElementById('toggle-chat');
    const chatBody = document.getElementById('chat-body');

    // Send message
    const sendMessage = () => {
        const message = chatInput.value.trim();
        if (!message) return;

        sendChatMessage(message);
        chatInput.value = '';
    };

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Toggle chat collapse
    toggleChatBtn.addEventListener('click', () => {
        if (chatBody.classList.contains('collapsed')) {
            chatBody.classList.remove('collapsed');
            toggleChatBtn.textContent = '−';
        } else {
            chatBody.classList.add('collapsed');
            toggleChatBtn.textContent = '+';
        }
    });

    // Auto-scroll to bottom
    const chatMessages = document.getElementById('chat-messages');
    const observer = new MutationObserver(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    observer.observe(chatMessages, { childList: true });
}

// Connect to chat channel
async function connectToChat() {
    if (!supabase) {
        console.warn('Supabase not configured, chat disabled');
        return;
    }

    // Load recent messages
    await loadRecentMessages();

    // Subscribe to new messages
    chatChannel = supabase
        .channel('global-chat')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            },
            (payload) => {
                console.log('New chat message:', payload);
                displayMessage(payload.new);
            }
        )
        .subscribe((status) => {
            console.log('Chat subscription status:', status);
        });
}

// Load recent chat messages
async function loadRecentMessages() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Display messages in correct order (oldest first)
        const messages = data.reverse();
        messages.forEach(message => displayMessage(message));
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Send a chat message
async function sendChatMessage(message) {
    if (!supabase) {
        console.error('Supabase not configured');
        displayLocalMessage('System', 'Chat is not available (Supabase not configured)', true);
        return;
    }

    try {
        const username = state.currentUser
            ? (await getUserUsername(state.currentUser.id))
            : 'Anonymous';

        const { error } = await supabase
            .from('chat_messages')
            .insert([
                {
                    user_id: state.currentUser?.id || null,
                    username: username,
                    message: message
                }
            ]);

        if (error) throw error;
    } catch (error) {
        console.error('Error sending message:', error);
        displayLocalMessage('System', 'Failed to send message', true);
    }
}

// Get username for user
async function getUserUsername(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data.username;
    } catch (error) {
        console.error('Error fetching username:', error);
        return 'User';
    }
}

// Display a message in the chat
function displayMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    
    const isAnon = !message.user_id;
    messageEl.className = `chat-message ${isAnon ? 'anon' : ''}`;

    const time = new Date(message.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageEl.innerHTML = `
        <div class="chat-message-user">${escapeHtml(message.username)}</div>
        <div class="chat-message-text">${escapeHtml(message.message)}</div>
        <div class="chat-message-time">${time}</div>
    `;

    chatMessages.appendChild(messageEl);

    // Keep only last 100 messages
    while (chatMessages.children.length > 100) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

// Display a local message (not from database)
function displayLocalMessage(username, message, isSystem = false) {
    const chatMessages = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    
    messageEl.className = `chat-message ${isSystem ? 'anon' : ''}`;

    const time = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageEl.innerHTML = `
        <div class="chat-message-user">${escapeHtml(username)}</div>
        <div class="chat-message-text">${escapeHtml(message)}</div>
        <div class="chat-message-time">${time}</div>
    `;

    chatMessages.appendChild(messageEl);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Disconnect from chat
export function disconnectChat() {
    if (chatChannel) {
        chatChannel.unsubscribe();
        chatChannel = null;
    }
}
