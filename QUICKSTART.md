# 🚀 Quick Start Guide

Get AIPR running locally in **under 2 minutes** without any setup!

## Run Immediately (Demo Mode)

You can run AIPR locally right away without setting up Supabase. The app will run in demo mode where you can explore the 3D globe and UI.

### Step 1: Clone the repository

```bash
git clone https://github.com/Edelfikter/AIPR-2.git
cd AIPR-2
```

### Step 2: Start a local server

Choose one of these methods:

**Using Python (easiest):**
```bash
python -m http.server 8000
# or Python 3
python3 -m http.server 8000
```

**Using Node.js:**
```bash
npx serve
```

**Using PHP:**
```bash
php -S localhost:8000
```

### Step 3: Open in browser

Open your browser and go to:
```
http://localhost:8000
```

You'll see the 3D globe interface immediately! 🌍

## What Works in Demo Mode

✅ Explore the 3D interactive globe  
✅ View the UI and interface  
✅ Test navigation and controls  
✅ See the design and layout  

⚠️ Limited functionality (no authentication, broadcasts, or chat)

## Full Setup (5-10 minutes)

To enable all features (authentication, broadcasts, chat), you need to set up Supabase:

👉 **[See Full Setup Guide in README.md](README.md#-quick-start)**

The full setup includes:
1. Creating a free Supabase account
2. Setting up database tables
3. Configuring your credentials
4. Enabling realtime features

## Troubleshooting

### "Cannot GET /" error
Make sure you're running the server from the AIPR-2 directory.

### Globe not loading
1. Check browser console for errors
2. Ensure you have a modern browser (Chrome 90+, Firefox 88+, Safari 14+)
3. Verify WebGL is enabled in your browser

### Port already in use
Change the port number:
```bash
python -m http.server 8080  # Use port 8080 instead
```

## Next Steps

- 📖 Read the [full documentation](README.md)
- 🔧 Complete the [Supabase setup](README.md#2-set-up-supabase) for full functionality
- 🎨 Explore the [design system](README.md#-design-system)
- 🤝 Learn how to [contribute](README.md#-contributing)

---

**Need help?** [Open an issue](https://github.com/Edelfikter/AIPR-2/issues) on GitHub
