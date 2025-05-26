# Chrome Session Viewer

A modern web application that processes Google Chrome session files client-side to extract and display all tabs that are/were open. This tool provides a beautiful, user-friendly interface to analyze Chrome session data without requiring any server-side processing.

## 🌐 Live Demo

Access the application directly at: **[lachlanallison.github.io/chrome-session-viewer](https://lachlanallison.github.io/chrome-session-viewer)**

No installation required - just visit the link and start analyzing your Chrome session files!

## Features

- **Client-Side Processing**: All file processing happens in your browser - no data is sent to any server
- **Drag & Drop Interface**: Simply drag your Chrome session file onto the upload area
- **Modern UI**: Beautiful, responsive design with Chrome-inspired styling
- **Comprehensive Tab Information**: View URLs, titles, active status, groups, and history
- **Export Options**: Export data as JSON or CSV for further analysis
- **Filter Options**: Show/hide deleted tabs and tab history
- **Real-time Favicons**: Automatically loads favicons for better visual identification

## How to Use

### 1. Find Your Chrome Session File

Chrome session files are typically located at:

**Windows:**
```
%LOCALAPPDATA%\Google\Chrome\User Data\Default\Sessions\
```

**macOS:**
```
~/Library/Application Support/Google/Chrome/Default/Sessions/
```

**Linux:**
```
~/.config/google-chrome/Default/Sessions/
```

Look for files named `Session_` followed by numbers (e.g., `Session_13390747476041490`).

### 2. Load the Session File

1. Visit [lachlanallison.github.io/chrome-session-viewer](https://lachlanallison.github.io/chrome-session-viewer) or open `index.html` locally in your web browser
2. Either:
   - Drag and drop your session file onto the upload area, or
   - Click "Browse Files" to select your session file

### 3. Analyze Your Data

Once loaded, you'll see:
- **Statistics**: Number of windows, tabs, and active tabs
- **Windows**: Each browser window with its tabs
- **Tab Details**: URLs, titles, active status, groups, and history
- **Controls**: Options to show deleted tabs and tab history

### 4. Export Data (Optional)

Use the export buttons to save your session data:
- **Export JSON**: Complete data structure for programmatic use
- **Export CSV**: Spreadsheet-friendly format for analysis

## Technical Details

### File Format

This application parses Chrome's SNSS (Session Service) file format, which contains:
- Magic number: "SNSS"
- Version number (supports versions 1 and 3)
- Series of commands that reconstruct the session state

### Supported Commands

The parser handles these Chrome session commands:
- `kCommandUpdateTabNavigation` (6): Tab URL and title updates
- `kCommandSetSelectedTabInIndex` (8): Active tab selection
- `kCommandSetTabWindow` (0): Tab-to-window assignment
- `kCommandSetTabGroup` (25): Tab group assignment
- `kCommandSetTabGroupMetadata2` (27): Tab group names
- `kCommandSetSelectedNavigationIndex` (7): Current history position
- `kCommandTabClosed` (16): Tab deletion
- `kCommandWindowClosed` (17): Window deletion
- `kCommandSetTabIndexInWindow` (2): Tab ordering
- `kCommandSetActiveWindow` (20): Active window selection

### Browser Compatibility

- Modern browsers with ES6+ support
- File API support for client-side file reading
- ArrayBuffer support for binary data processing

## Files Structure

```
├── assets/             # Images and favicons
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   └── Screenshot.png
├── index.html          # Main HTML interface
├── site.webmanifest    # PWA manifest
├── styles.css          # Modern CSS styling
├── session-parser.js   # Core session file parser
├── app.js             # Application logic and UI handling
└── README.md          # This documentation
```

## Privacy & Security

- **No Server Communication**: All processing happens locally in your browser
- **No Data Storage**: Session data is only held in memory during analysis
- **No External Dependencies**: Works completely offline (except for favicon loading)

## Deployment

This application is hosted on GitHub Pages at [lachlanallison.github.io/chrome-session-viewer](https://lachlanallison.github.io/chrome-session-viewer). The deployment is automatic - any changes pushed to the main branch will be reflected on the live site.

### Local Development

To run locally:
1. Clone this repository
2. Open `index.html` in your web browser
3. No build process or server required!

## Development

### Based on Original Go Implementation

This JavaScript implementation is based on the excellent Go version by Aetnaeus:
- Original Source: https://github.com/lemnos/chrome-session-dump
- Translated to JavaScript for client-side web processing

### Key Differences from Go Version

- **Client-Side**: Runs in web browsers instead of command line
- **Interactive UI**: Visual interface instead of command-line output
- **Real-time Processing**: Immediate visual feedback during parsing
- **Export Options**: Built-in JSON and CSV export functionality

## Troubleshooting

### Common Issues

1. **"Invalid SNSS file" Error**
   - Ensure you're using a Chrome session file (not bookmarks or other data)
   - Check that the file isn't corrupted

2. **No Tabs Showing**
   - Try enabling "Show deleted tabs" option
   - Verify the session file contains tab data

3. **Parsing Errors**
   - Some session files may use newer formats not yet supported
   - Check browser console for detailed error messages

### Browser Requirements

- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- JavaScript enabled
- File API support

## Contributing

Feel free to contribute improvements:
- Bug fixes for parsing edge cases
- UI/UX enhancements
- Support for additional Chrome session commands
- Performance optimizations

## License

This project maintains the same spirit as the original Go implementation - free to use and modify for personal and educational purposes. 