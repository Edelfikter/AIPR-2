// Auth.js - Supabase authentication handling
import { supabase, state } from './app.js';

// Initialize authentication
export function initAuth() {
    // Set up modal handlers
    setupAuthModals();

    // Check for existing session
    checkSession();

    // Listen for auth state changes
    if (supabase && supabase.auth) {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            if (session) {
                handleAuthSuccess(session.user);
            } else {
                handleAuthLogout();
            }
        });
    }

    console.log('🔐 Auth initialized');
}

// Set up authentication modal handlers
function setupAuthModals() {
    // Login modal
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLogin = document.getElementById('close-login');
    const loginSubmit = document.getElementById('login-submit-btn');

    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });

    closeLogin.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    loginSubmit.addEventListener('click', handleLogin);

    // Signup modal
    const signupBtn = document.getElementById('signup-btn');
    const signupModal = document.getElementById('signup-modal');
    const closeSignup = document.getElementById('close-signup');
    const signupSubmit = document.getElementById('signup-submit-btn');

    signupBtn.addEventListener('click', () => {
        signupModal.style.display = 'flex';
    });

    closeSignup.addEventListener('click', () => {
        signupModal.style.display = 'none';
    });

    signupSubmit.addEventListener('click', handleSignup);

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', handleLogout);

    // Close modals on outside click
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    signupModal.addEventListener('click', (e) => {
        if (e.target === signupModal) {
            signupModal.style.display = 'none';
        }
    });
}

// Check for existing session
async function checkSession() {
    if (!supabase || !supabase.auth) return;

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
            handleAuthSuccess(session.user);
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('login-message');

    if (!email || !password) {
        showMessage(messageEl, 'Please fill in all fields', 'error');
        return;
    }

    if (!supabase || !supabase.auth) {
        showMessage(messageEl, 'Supabase not configured. Please check console for setup instructions.', 'error');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        showMessage(messageEl, 'Login successful!', 'success');
        
        // Get user profile
        await getUserProfile(data.user.id);

        setTimeout(() => {
            document.getElementById('login-modal').style.display = 'none';
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        showMessage(messageEl, error.message, 'error');
    }
}

// Handle signup
async function handleSignup() {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const messageEl = document.getElementById('signup-message');

    if (!username || !email || !password) {
        showMessage(messageEl, 'Please fill in all fields', 'error');
        return;
    }

    if (!supabase || !supabase.auth) {
        showMessage(messageEl, 'Supabase not configured. Please check console for setup instructions.', 'error');
        return;
    }

    try {
        // Sign up user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (error) throw error;

        // Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: data.user.id,
                    username: username
                }
            ]);

        if (profileError) throw profileError;

        showMessage(messageEl, 'Account created successfully! Please check your email to verify.', 'success');

        setTimeout(() => {
            document.getElementById('signup-modal').style.display = 'none';
        }, 2000);
    } catch (error) {
        console.error('Signup error:', error);
        showMessage(messageEl, error.message, 'error');
    }
}

// Handle logout
async function handleLogout() {
    if (!supabase || !supabase.auth) return;

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        handleAuthLogout();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Get user profile
async function getUserProfile(userId) {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

// Handle successful authentication
async function handleAuthSuccess(user) {
    state.currentUser = user;

    // Get profile data
    const profile = await getUserProfile(user.id);
    const username = profile?.username || user.email.split('@')[0];

    // Update UI
    document.getElementById('username-display').textContent = `👤 ${username}`;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('signup-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'block';
    document.getElementById('create-broadcast-btn').style.display = 'block';

    console.log('✅ User authenticated:', username);
}

// Handle logout
function handleAuthLogout() {
    state.currentUser = null;

    // Update UI
    document.getElementById('username-display').textContent = '';
    document.getElementById('login-btn').style.display = 'inline-block';
    document.getElementById('signup-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('create-broadcast-btn').style.display = 'none';

    console.log('👋 User logged out');
}

// Show message helper
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `auth-message ${type}`;
    element.style.display = 'block';
}

// Get current user
export function getCurrentUser() {
    return state.currentUser;
}
