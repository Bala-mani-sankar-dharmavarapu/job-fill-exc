# Enhanced Form AutoFill Chrome Extension

A smart Chrome Extension that automatically fills web forms with persistent, user-defined data. Features a minimal popup interface and a floating on-page form editor for seamless form management.

## ✨ Enhanced Features

- 🚀 **Minimal Popup UI**: Clean interface with just two buttons
- 🪟 **Floating Form Editor**: Edit form data directly on any webpage
- 💾 **Persistent Storage**: Save and load form data using chrome.storage.local
- 🌐 **Domain-Specific Profiles**: Different form data for different websites
- 📚 **Field Learning**: Automatically learns new fields as you type
- 🎯 **Smart Form Detection**: Supports all major input types
- 📁 **File Input Handling**: Visual alerts for file upload fields
- ✅ **UI Feedback**: Success/error messages with visual indicators

## 🎯 Supported Input Types

- ✅ **Text inputs** (`<input type="text">`)
- ✅ **Email inputs** (`<input type="email">`)
- ✅ **Phone inputs** (`<input type="tel">`)
- ✅ **URL inputs** (`<input type="url">`)
- ✅ **Search inputs** (`<input type="search">`)
- ✅ **Textareas** (`<textarea>`)
- ✅ **Select dropdowns** (`<select>`)
- ✅ **Radio buttons** (`<input type="radio">`)
- ✅ **Checkboxes** (`<input type="checkbox">`)
- ✅ **Date inputs** (`<input type="date">`)
- ✅ **Time inputs** (`<input type="time">`)
- ✅ **File inputs** (`<input type="file">`) - Visual alerts only

## Project Structure

```
form-autofill-extension/
├── public/
│   └── manifest.json          # Chrome Extension manifest (V3)
├── src/
│   ├── popup/
│   │   ├── App.jsx           # Minimal popup component
│   │   ├── App.css           # Popup styles
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Global styles
│   ├── contentScript.js      # Enhanced content script with floating editor
│   └── floatingForm.jsx      # Floating form editor component
├── background.js             # Background service worker
├── backend/
│   ├── server.js             # Express API server (optional)
│   └── package.json          # Backend dependencies
├── form.html                 # Enhanced test form
├── index.html               # React popup entry
├── vite.config.js           # Vite configuration
├── package.json             # Main dependencies
└── README.md               # This file
```

## 🚀 Installation & Setup

### 1. Install Dependencies

```bash
# Install main extension dependencies
npm install

# Install backend dependencies (optional)
cd backend
npm install
cd ..
```

### 2. Build the Extension

```bash
# Build the extension
npm run build
```

This creates a `dist/` folder with the built extension.

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project
5. The extension should now appear in your extensions list

### 4. Start Backend (Optional)

```bash
# Start the backend API server
cd backend
npm start
```

The backend will run on `http://localhost:5001` and provide form data via `/form-data` endpoint.

## 📖 Usage Guide

### Minimal Popup Interface

The extension popup now has just two buttons:

1. **Fill Now** - Automatically fills forms on the current page
2. **Form Data** - Opens a floating form editor on the page

### Floating Form Editor

When you click "Form Data":

1. **Floating Editor Opens**: A modal appears on the webpage
2. **Edit Your Data**: Update name, email, phone, address, resume path
3. **Domain-Specific**: Automatically uses the current website's profile
4. **Save Changes**: Click "Save" to persist your data
5. **Editor Closes**: The floating form disappears after saving

### Domain-Specific Profiles

The extension automatically manages profiles per website:

- **Automatic Detection**: Uses the current website's domain
- **Profile Switching**: Choose between different domain profiles
- **Default Fallback**: Uses default profile if no domain-specific exists
- **Persistent Storage**: All data saved to chrome.storage.local

### Field Learning

The extension learns new fields automatically:

1. **Automatic Detection**: When you type in unknown fields
2. **Smart Matching**: Matches fields by name, ID, or partial matches
3. **Persistent Storage**: Learned fields are saved for future use
4. **Dynamic Forms**: New fields appear in the floating editor

## 🧪 Testing

### Enhanced Test Form

Open `form.html` in your browser to test all features:

- ✅ Basic text fields (name, email, phone, address)
- ✅ Additional fields (website, birthdate, meeting time)
- ✅ Dropdown selections (country, experience level)
- ✅ Radio button groups (employment type, remote work)
- ✅ Checkbox groups (skills, notifications)
- ✅ File upload fields (resume, cover letter)

### Testing Workflow

1. **Load Extension**: Install from `dist/` folder
2. **Open Test Form**: Navigate to `form.html`
3. **Click "Form Data"**: Opens floating editor
4. **Enter Your Data**: Fill in your information
5. **Save Profile**: Click "Save" to store data
6. **Click "Fill Now"**: Watch forms auto-fill!
7. **Test Learning**: Type in new fields to see them learned

## 🔧 Advanced Features

### Smart Field Matching

The extension uses intelligent field matching:

1. **Exact matches**: Field name exactly matches data key
2. **Case-insensitive**: Ignores case differences
3. **Partial matches**: Field name contains data key or vice versa
4. **ID matching**: Matches by field ID as well as name

### File Input Handling

Since Chrome extensions cannot programmatically set file input values:

- **Visual Indicators**: File inputs get red dashed borders
- **Tooltips**: Show which file to manually upload
- **Resume Path**: Uses stored resumePath to suggest the correct file
- **Manual Upload**: Clear instructions for file uploads

### UI Feedback

- **Success Messages**: Green alerts when forms are filled successfully
- **Error Messages**: Red alerts when no fields are found
- **Page Alerts**: Visual notifications on the webpage itself
- **Toast Messages**: Temporary success/error feedback

## 📊 Data Structure

### Form Profiles Storage

```json
{
  "formProfiles": {
    "default": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "address": "123 Main St, Springfield",
      "resumePath": "/path/to/resume.pdf"
    },
    "linkedin.com": {
      "name": "John Doe",
      "email": "john@example.com",
      "linkedinUrl": "https://linkedin.com/in/johndoe"
    },
    "indeed.com": {
      "name": "John Doe",
      "email": "john@example.com",
      "experience": "5+ years"
    }
  }
}
```

## 🛠️ Development

### Development Mode

```bash
# Start Vite dev server for popup
npm run dev

# Start backend (in separate terminal)
cd backend
npm run dev
```

### Building for Production

```bash
# Build extension
npm run build

# The dist/ folder is ready to load in Chrome
```

## 🔍 Troubleshooting

### Extension Not Working

1. Check Chrome's developer console for errors
2. Ensure the extension is loaded in developer mode
3. Verify the content script is injected (check console logs)
4. Check that storage permissions are granted

### Floating Editor Issues

1. Make sure you're on a webpage (not chrome:// pages)
2. Check for any JavaScript errors in the console
3. Try refreshing the page and opening the editor again
4. Ensure the extension has proper permissions

### Form Fields Not Filling

1. Check that field names/ids match your saved data
2. Ensure fields are not hidden or disabled
3. Try refreshing the page and testing again
4. Check the browser console for any error messages

### Profile Issues

1. Verify that your data is saved (check the floating editor)
2. Try switching between profiles in the editor
3. Clear storage and re-enter your data if needed
4. Check that the domain is being detected correctly

### File Input Issues

1. File inputs cannot be programmatically filled
2. Look for red dashed borders around file inputs
3. Check tooltips for manual upload instructions
4. Ensure resumePath is set in your profile

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with the enhanced test form
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues or questions, please open an issue on GitHub with:

- Browser version and OS
- Steps to reproduce the issue
- Console error messages (if any)
- Expected vs actual behavior
