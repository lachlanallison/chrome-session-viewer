// Main application logic for Chrome Session Dump Web

class ChromeSessionDumpApp {
    constructor() {
        this.parser = new SessionParser();
        this.currentData = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File input handling
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const removeFile = document.getElementById('removeFile');

        if (!fileInput || !uploadArea || !removeFile) {
            console.error('Required DOM elements not found');
            return;
        }

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        removeFile.addEventListener('click', () => this.clearFile());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        uploadArea.addEventListener('click', () => fileInput.click());

        // Control checkboxes
        const showDeleted = document.getElementById('showDeleted');
        const showHistory = document.getElementById('showHistory');
        
        if (showDeleted && showHistory) {
            showDeleted.addEventListener('change', () => this.updateDisplay());
            showHistory.addEventListener('change', () => this.updateDisplay());
        }

        // Export buttons
        const exportJson = document.getElementById('exportJson');
        const exportCsv = document.getElementById('exportCsv');
        
        if (exportJson && exportCsv) {
            exportJson.addEventListener('click', () => this.exportJson());
            exportCsv.addEventListener('click', () => this.exportCsv());
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.add('dragover');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.remove('dragover');
        }
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    async processFile(file) {
        try {
            console.log('Processing file:', file.name, 'Size:', file.size);
            this.showLoading();
            this.hideError();

            // Show file info
            this.showFileInfo(file);

            // Read file as ArrayBuffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            console.log('File read successfully, size:', arrayBuffer.byteLength);

            // Reset parser state
            this.parser.reset();

            // Parse the session file
            console.log('Starting to parse session file...');
            this.currentData = await this.parser.parseSessionFile(arrayBuffer);
            console.log('Parsing completed, data:', this.currentData);

            // Display results
            this.showResults();
            this.updateDisplay();

        } catch (error) {
            console.error('Error processing file:', error);
            this.showError(`Error processing file: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    showFileInfo(file) {
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileInfo = document.getElementById('fileInfo');

        if (fileName && fileSize && fileInfo) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            fileInfo.style.display = 'block';
        }
    }

    clearFile() {
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const controls = document.getElementById('controls');
        const results = document.getElementById('results');

        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (results) results.style.display = 'none';
        
        this.hideError();
        this.currentData = null;
    }

    showLoading() {
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'block';
            results.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Parsing session file...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be replaced by actual results or hidden
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorElement && errorText) {
            errorText.textContent = message;
            errorElement.style.display = 'flex';
        }
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showResults() {
        const controls = document.getElementById('controls');
        
        if (controls) controls.style.display = 'flex';
        this.ensureResultsStructure();
    }

    updateDisplay() {
        if (!this.currentData) {
            console.warn('No data to display');
            return;
        }

        const showDeleted = document.getElementById('showDeleted');
        const showHistory = document.getElementById('showHistory');
        
        const showDeletedChecked = showDeleted ? showDeleted.checked : false;
        const showHistoryChecked = showHistory ? showHistory.checked : false;

        console.log('Updating display with options:', { showDeletedChecked, showHistoryChecked });
        
        this.renderResults(this.currentData, showDeletedChecked, showHistoryChecked);
        this.updateStats(this.currentData, showDeletedChecked);
    }

    renderResults(data, showDeleted, showHistory) {
        // First ensure the results structure exists
        this.ensureResultsStructure();
        
        const container = document.getElementById('windowsContainer');
        if (!container) {
            console.error('windowsContainer element not found after ensuring structure');
            console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
            this.showError('UI error: windowsContainer element not found');
            return;
        }

        console.log('Rendering results for', data.windows.length, 'windows');
        container.innerHTML = '';

        data.windows.forEach((window, windowIndex) => {
            if (!showDeleted && window.deleted) return;

            const windowElement = this.createWindowElement(window, windowIndex, showDeleted, showHistory);
            if (windowElement) {
                container.appendChild(windowElement);
            }
        });
    }

    ensureResultsStructure() {
        const results = document.getElementById('results');
        if (!results) {
            console.error('results element not found');
            return;
        }
        
        results.style.display = 'block';
        
        // Check if windowsContainer exists, if not recreate the structure
        if (!document.getElementById('windowsContainer')) {
            console.log('Recreating results structure');
            results.innerHTML = `
                <div class="results-header">
                    <h2>Session Data</h2>
                    <div class="stats" id="stats"></div>
                </div>
                
                <div class="windows-container" id="windowsContainer">
                    <!-- Windows and tabs will be populated here -->
                </div>
            `;
        }
    }

    createWindowElement(window, windowIndex, showDeleted, showHistory) {
        try {
            const windowDiv = document.createElement('div');
            windowDiv.className = `window ${window.active ? 'active' : ''} ${window.deleted ? 'deleted' : ''}`;

            const visibleTabs = window.tabs.filter(tab => showDeleted || !tab.deleted);
            
            windowDiv.innerHTML = `
                <div class="window-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <i class="fas fa-window-maximize"></i>
                    <span class="window-title">Window ${windowIndex + 1}</span>
                    <span class="tab-count">${visibleTabs.length} tabs</span>
                    <button class="window-toggle" onclick="event.stopPropagation(); this.closest('.window').classList.toggle('collapsed');">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>
                <div class="tabs-container">
                    ${visibleTabs.map(tab => this.createTabHTML(tab, showHistory)).join('')}
                </div>
            `;

            return windowDiv;
        } catch (error) {
            console.error('Error creating window element:', error);
            return null;
        }
    }

    createTabHTML(tab, showHistory) {
        try {
            const favicon = this.getFaviconUrl(tab.url);
            const badges = [];

            if (tab.active) badges.push('<span class="tab-badge active">Active</span>');
            if (tab.deleted) badges.push('<span class="tab-badge deleted">Deleted</span>');
            if (tab.group) badges.push(`<span class="tab-badge group">${this.escapeHtml(tab.group)}</span>`);

            const historyHTML = showHistory && tab.history.length > 1 ? `
                <div class="tab-history">
                    <h4>History (${tab.history.length} items)</h4>
                    ${tab.history.map(item => `
                        <div class="history-item">
                            <div class="history-title">${this.escapeHtml(item.title || 'Untitled')}</div>
                            <a href="${this.escapeHtml(item.url)}" class="history-url" target="_blank" rel="noopener">
                                ${this.escapeHtml(item.url)}
                            </a>
                        </div>
                    `).join('')}
                </div>
            ` : '';

            return `
                <div class="tab ${tab.active ? 'active' : ''} ${tab.deleted ? 'deleted' : ''}">
                    <div class="tab-header">
                        <img src="${favicon}" class="tab-favicon" alt="Favicon" onerror="this.style.display='none'">
                        <div class="tab-content">
                            <div class="tab-title">${this.escapeHtml(tab.title || 'Untitled')}</div>
                            <a href="${this.escapeHtml(tab.url)}" class="tab-url" target="_blank" rel="noopener">
                                ${this.escapeHtml(tab.url)}
                            </a>
                            <div class="tab-meta">
                                ${badges.join('')}
                            </div>
                        </div>
                    </div>
                    ${historyHTML}
                </div>
            `;
        } catch (error) {
            console.error('Error creating tab HTML:', error);
            return '<div class="tab error">Error rendering tab</div>';
        }
    }

    updateStats(data, showDeleted) {
        const stats = document.getElementById('stats');
        if (!stats) return;
        
        let totalTabs = 0;
        let activeTabs = 0;
        let deletedTabs = 0;
        let totalWindows = 0;
        let activeWindows = 0;

        data.windows.forEach(window => {
            if (!showDeleted && window.deleted) return;
            
            totalWindows++;
            if (window.active) activeWindows++;

            window.tabs.forEach(tab => {
                if (!showDeleted && tab.deleted) return;
                
                totalTabs++;
                if (tab.active) activeTabs++;
                if (tab.deleted) deletedTabs++;
            });
        });

        const statsHTML = [
            `<span class="stat-item">${totalWindows} Windows</span>`,
            `<span class="stat-item">${totalTabs} Tabs</span>`,
            `<span class="stat-item">${activeTabs} Active</span>`
        ];

        if (showDeleted && deletedTabs > 0) {
            statsHTML.push(`<span class="stat-item">${deletedTabs} Deleted</span>`);
        }

        stats.innerHTML = statsHTML.join('');
    }

    getFaviconUrl(url) {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch {
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23666" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    exportJson() {
        if (!this.currentData) return;

        const dataStr = JSON.stringify(this.currentData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        this.downloadBlob(blob, 'chrome-session-data.json');
    }

    exportCsv() {
        if (!this.currentData) return;

        const showDeleted = document.getElementById('showDeleted');
        const showDeletedChecked = showDeleted ? showDeleted.checked : false;
        const rows = [['Window', 'Tab Index', 'Title', 'URL', 'Active', 'Deleted', 'Group']];

        this.currentData.windows.forEach((window, windowIndex) => {
            if (!showDeletedChecked && window.deleted) return;

            window.tabs.forEach((tab, tabIndex) => {
                if (!showDeletedChecked && tab.deleted) return;

                rows.push([
                    `Window ${windowIndex + 1}`,
                    tabIndex + 1,
                    tab.title || 'Untitled',
                    tab.url,
                    tab.active ? 'Yes' : 'No',
                    tab.deleted ? 'Yes' : 'No',
                    tab.group || ''
                ]);
            });
        });

        const csvContent = rows.map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadBlob(blob, 'chrome-session-data.csv');
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Chrome Session Dump App');
    new ChromeSessionDumpApp();
}); 