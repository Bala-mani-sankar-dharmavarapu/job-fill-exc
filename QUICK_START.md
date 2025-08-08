# 🚀 Quick Start Guide - Job Fill Pro

## ✅ Extension is Ready!

The extension has been successfully built and is ready to use. Here's how to get started:

## 1. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. You should see "Job Fill Pro" in your extensions list

## 2. Set Up the Backend (Required for Resume Enhancement)

### Get Your Free API Key

1. Visit [https://qrok.ai](https://qrok.ai)
2. Sign up for a free account
3. Get your API key from the dashboard

### Configure the Backend

1. Create a `.env` file in the `job-fill-backend` folder:

```env
QROK_API_KEY=your_qrok_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

2. Start the backend server:

```bash
cd job-fill-backend
npm install
npm start
```

The server will run on http://localhost:5001

## 3. Test the Extension

### Form AutoFill (Works immediately)

1. Go to any job application form
2. Click the extension icon
3. Click "Fill Now" to auto-fill the form
4. Use "Form Data" to edit your information

### Resume Enhancement (Requires backend)

1. Go to a job listing page (LinkedIn, Indeed, etc.)
2. Click the extension icon
3. Click "Extract Job Description"
4. Upload your resume (PDF/DOCX)
5. Click "Create Enhanced Resume"
6. Download the enhanced version

## 4. Troubleshooting

### Extension Not Loading

- Make sure you're loading the `dist` folder, not the root
- Check Chrome's developer console for errors
- Try refreshing the extensions page

### Resume Enhancement Not Working

- Ensure the backend server is running on port 5001
- Check that your Qrok API key is valid
- Verify the file format (PDF/DOCX only, max 5MB)

### Form AutoFill Not Working

- Make sure you're on a webpage (not chrome:// pages)
- Check that the extension has proper permissions
- Try refreshing the page

## 5. Files Included

The `dist` folder now contains all required files:

- ✅ `manifest.json` - Extension configuration
- ✅ `contentScript.js` - Job description extraction
- ✅ `background.js` - Background service worker
- ✅ `index.html` - Popup interface
- ✅ `popup.js` - React popup application
- ✅ `popup.css` - Popup styling

## 🎉 You're Ready to Go!

The extension is now fully functional with both form auto-fill and resume enhancement capabilities!
