# All India Public Radio (AIPR)

🎙️ A community radio platform where anyone can create and broadcast their own radio station on a 3D globe.

<div align="center">
  <img src="assets/logo.svg" alt="AIPR Logo" width="250">
</div>

---

## 🏃 Want to run this immediately?

**👉 [See QUICKSTART.md](QUICKSTART.md) - Get running in under 2 minutes!**

For full setup with all features, continue reading below.

---

## ✨ Features

- **3D Interactive Globe** - Stunning WebGL globe focused on the Indian subcontinent with smooth controls
- **Drop Pins Anywhere** - Place your radio station anywhere in the world
- **Build Custom Broadcasts** - Mix YouTube tracks and TTS callouts with advanced editing
- **True Live Sync** - Everyone hears the exact same thing at the same time
- **Global Chat** - One chat room for all listeners worldwide
- **SAM TTS** - Classic Microsoft SAM voice with authentic radio filter effects
- **Anonymous Listening** - No account required to explore and listen
- **Reactive Pins** - Animated station markers with glow effects and parallax

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| 3D Globe | Globe.gl (WebGL) |
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime (Chat & Sync) |
| TTS | sam-js (Microsoft SAM clone) |
| Audio Processing | Web Audio API |
| Video | YouTube IFrame API |

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Edelfikter/AIPR-2.git
cd AIPR-2
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon/public key

### 3. Create Database Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (id)
);

-- Broadcasts table
CREATE TABLE broadcasts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_live BOOLEAN DEFAULT false,
    is_looping BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    timeline_data JSONB NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Listeners table (for counting)
CREATE TABLE listeners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE listeners ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Broadcasts policies
CREATE POLICY "Broadcasts are viewable by everyone"
    ON broadcasts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create broadcasts"
    ON broadcasts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own broadcasts"
    ON broadcasts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own broadcasts"
    ON broadcasts FOR DELETE
    USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Chat messages are viewable by everyone"
    ON chat_messages FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (true);

-- Listeners policies
CREATE POLICY "Listeners are viewable by everyone"
    ON listeners FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert listener records"
    ON listeners FOR INSERT
    WITH CHECK (true);
```

### 4. Enable Realtime

In your Supabase dashboard:
1. Go to **Database** → **Replication**
2. Enable replication for the `chat_messages` table

### 5. Configure Your App

**Option 1: Direct configuration (Quick start)**

Edit `js/app.js` and replace the placeholder values:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Your anon/public key
```

**Option 2: Config file (Recommended for production)**

1. Copy `config.example.js` to `config.js`
2. Fill in your Supabase credentials in `config.js`
3. `config.js` is already in `.gitignore` and won't be committed

Note: For production deployments, consider using environment variables.

### 6. Run the App

Since this is a static site, you can use any local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

## 📁 File Structure

```
AIPR-2/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # All styles
├── js/
│   ├── app.js             # Main app initialization
│   ├── globe.js           # 3D globe and pin management
│   ├── auth.js            # Supabase authentication
│   ├── broadcast.js       # Broadcast editor logic
│   ├── player.js          # Synchronized playback
│   ├── tts.js             # SAM TTS + radio filter
│   ├── chat.js            # Global chat
│   └── timeline.js        # Timeline editor
├── assets/
│   └── logo.svg           # AIPR logo
└── README.md              # This file
```

## 🎨 Design System

### Colors
- **Dark Background**: `#0a1612` - Deep green-black
- **Green (Primary)**: `#2ecc71` - Main accent
- **Magenta**: `#c44b99` - Secondary accent
- **Blue**: `#6b8cce` - Info/links
- **Orange**: `#e67e4a` - Live indicators
- **Olive**: `#a8a052` - Muted text

### Fonts
- **UI Elements**: Space Mono (monospace)
- **Body Text**: Space Grotesk

## 🎯 Usage Guide

### For Listeners (No Account Required)
1. Open the app and explore the globe
2. Click on any glowing pin to see station info
3. Click "Tune In" to start listening
4. Use the global chat to connect with others

### For Broadcasters
1. Sign up for an account
2. Click "Create Broadcast"
3. Add YouTube tracks with trim and fade controls
4. Add TTS callouts with radio filter effects
5. Arrange items in your timeline
6. Click "GO LIVE" to start broadcasting

### Creating TTS Callouts
1. Type your message (e.g., "You're listening to Radio Delhi")
2. Choose reverb intensity (subtle/medium/heavy)
3. Preview to hear the radio filter effect
4. Add to timeline

### Broadcasting Tips
- Mix tracks and TTS callouts for a professional radio feel
- Use TTS for station IDs, announcements, and transitions
- Enable looping for 24/7 broadcasts
- Click on the globe to set your station location

## 🔧 Development

### Adding New Features
The app is modular, so you can easily extend it:

- **globe.js** - Customize globe appearance or pin animations
- **player.js** - Enhance playback logic or add audio effects
- **tts.js** - Adjust radio filter parameters
- **styles.css** - Customize the theme and colors

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL and Web Audio API support required.

## 🔒 Security Notes

- Never commit real Supabase credentials to version control
- Use the `config.js` approach (with `.gitignore`) or environment variables
- The anon/public key is safe for client-side use (Supabase handles permissions via RLS)
- For production, consider implementing rate limiting and additional security measures
- CDN resources should use Subresource Integrity (SRI) hashes in production

## 🐛 Troubleshooting

### "Supabase not configured" error
- Make sure you've updated `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/app.js`
- Check that your Supabase project is active

### Globe not loading
- Check browser console for errors
- Ensure WebGL is enabled in your browser
- Try refreshing the page

### Chat not working
- Verify Realtime is enabled for `chat_messages` table
- Check Supabase Dashboard for connection status

### TTS not working
- Ensure sam-js library is loaded (check browser console)
- Try a different browser (Chrome works best)
- Check that Web Audio API is supported

## 📄 License

MIT License - Feel free to use this for your own projects!

## 🙏 Credits

- Globe.gl by Vasco Asturiano
- sam-js by Discordier
- Supabase for backend infrastructure
- Community radio stations worldwide for inspiration

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions

---

Made with 📻 and ❤️ in India
