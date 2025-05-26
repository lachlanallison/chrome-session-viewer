// Chrome Session Parser - JavaScript implementation
// Based on the Go implementation for parsing Chrome session files

class SessionParser {
    constructor() {
        // Command constants from Chrome source
        this.kCommandUpdateTabNavigation = 6;
        this.kCommandSetSelectedTabInIndex = 8;
        this.kCommandSetTabWindow = 0;
        this.kCommandSetTabGroup = 25;
        this.kCommandSetTabGroupMetadata2 = 27;
        this.kCommandSetSelectedNavigationIndex = 7;
        this.kCommandTabClosed = 16;
        this.kCommandWindowClosed = 17;
        this.kCommandSetTabIndexInWindow = 2;
        this.kCommandSetActiveWindow = 20;
        this.kCommandLastActiveTime = 21;

        // Data structures
        this.tabs = new Map();
        this.windows = new Map();
        this.groups = new Map();
        this.activeWindow = null;
    }

    // Helper methods for reading binary data
    readUint8(buffer, offset) {
        if (offset >= buffer.length) {
            throw new Error(`Offset ${offset} out of bounds for buffer length ${buffer.length}`);
        }
        return buffer[offset];
    }

    readUint16(buffer, offset) {
        if (offset + 1 >= buffer.length) {
            throw new Error(`Offset ${offset} out of bounds for buffer length ${buffer.length}`);
        }
        return buffer[offset] | (buffer[offset + 1] << 8);
    }

    readUint32(buffer, offset) {
        if (offset + 3 >= buffer.length) {
            throw new Error(`Offset ${offset} out of bounds for buffer length ${buffer.length}`);
        }
        return (buffer[offset] |
                (buffer[offset + 1] << 8) |
                (buffer[offset + 2] << 16) |
                (buffer[offset + 3] << 24)) >>> 0; // Unsigned 32-bit
    }

    readUint64(buffer, offset) {
        if (offset + 7 >= buffer.length) {
            throw new Error(`Offset ${offset} out of bounds for buffer length ${buffer.length}`);
        }
        // JavaScript doesn't handle 64-bit integers natively, so we'll use BigInt
        const low = this.readUint32(buffer, offset);
        const high = this.readUint32(buffer, offset + 4);
        return BigInt(high) << 32n | BigInt(low);
    }

    readString(buffer, offset) {
        if (offset + 3 >= buffer.length) {
            throw new Error(`Offset ${offset} out of bounds for buffer length ${buffer.length}`);
        }
        
        const size = this.readUint32(buffer, offset);
        let realSize = size;
        if (realSize % 4 !== 0) {
            realSize += 4 - (realSize % 4); // Chrome 32-bit aligns pickled data
        }

        if (offset + 4 + size > buffer.length) {
            throw new Error(`String size ${size} exceeds buffer bounds`);
        }

        const stringBytes = buffer.slice(offset + 4, offset + 4 + size);
        const decoder = new TextDecoder('utf-8');
        return {
            value: decoder.decode(stringBytes),
            bytesRead: 4 + realSize
        };
    }

    readString16(buffer, offset) {
        if (offset + 3 >= buffer.length) {
            throw new Error(`Offset ${offset} out of bounds for buffer length ${buffer.length}`);
        }
        
        const size = this.readUint32(buffer, offset);
        let realSize = size * 2;
        if (realSize % 4 !== 0) {
            realSize += 4 - (realSize % 4); // Chrome 32-bit aligns pickled data
        }

        if (offset + 4 + realSize > buffer.length) {
            throw new Error(`String16 size ${realSize} exceeds buffer bounds`);
        }

        const stringData = [];
        for (let i = 0; i < size * 2; i += 2) {
            if (offset + 4 + i + 1 < buffer.length) {
                const char = buffer[offset + 4 + i] | (buffer[offset + 4 + i + 1] << 8);
                stringData.push(char);
            }
        }

        return {
            value: String.fromCharCode(...stringData),
            bytesRead: 4 + realSize
        };
    }

    getWindow(id) {
        if (!this.windows.has(id)) {
            this.windows.set(id, {
                id: id,
                activeTabIdx: -1, // Start with -1 to indicate no active tab set
                deleted: false,
                tabs: []
            });
        }
        return this.windows.get(id);
    }

    getTab(id) {
        if (!this.tabs.has(id)) {
            this.tabs.set(id, {
                id: id,
                history: [],
                idx: 0,
                win: 0,
                deleted: false,
                currentHistoryIdx: 0,
                group: null
            });
        }
        return this.tabs.get(id);
    }

    getGroup(high, low) {
        const key = `${high.toString(16)}${low.toString(16)}`;
        if (!this.groups.has(key)) {
            this.groups.set(key, {
                high: high,
                low: low,
                name: ""
            });
        }
        return this.groups.get(key);
    }

    async parseSessionFile(arrayBuffer) {
        const buffer = new Uint8Array(arrayBuffer);
        let offset = 0;

        console.log('Parsing session file, buffer size:', buffer.length);

        // Check magic number "SNSS"
        if (buffer.length < 8) {
            throw new Error('File too small to be a valid SNSS file');
        }

        const magic = buffer.slice(0, 4);
        const expectedMagic = [0x53, 0x4E, 0x53, 0x53]; // "SNSS"
        
        console.log('Magic bytes:', Array.from(magic).map(b => '0x' + b.toString(16).padStart(2, '0')));
        
        if (!magic.every((byte, i) => byte === expectedMagic[i])) {
            throw new Error('Invalid SNSS file: incorrect magic number');
        }
        offset += 4;

        // Read version
        const version = this.readUint32(buffer, offset);
        offset += 4;

        console.log('SNSS version:', version);

        if (version !== 1 && version !== 3) {
            throw new Error(`Invalid SNSS file: unsupported version ${version}`);
        }

        // Parse commands
        let commandCount = 0;
        while (offset < buffer.length) {
            if (offset + 3 >= buffer.length) break;

            try {
                const commandSize = this.readUint16(buffer, offset) - 1;
                offset += 2;

                const commandType = this.readUint8(buffer, offset);
                offset += 1;

                if (offset + commandSize > buffer.length) {
                    console.warn(`Command ${commandCount} size ${commandSize} exceeds buffer bounds, stopping`);
                    break;
                }

                const commandData = buffer.slice(offset, offset + commandSize);
                this.processCommand(commandType, commandData);
                
                offset += commandSize;
                commandCount++;

                if (commandCount % 1000 === 0) {
                    console.log(`Processed ${commandCount} commands...`);
                }
            } catch (error) {
                console.warn(`Error processing command ${commandCount} at offset ${offset}:`, error);
                break;
            }
        }

        console.log(`Processed ${commandCount} commands total`);
        console.log(`Found ${this.tabs.size} tabs, ${this.windows.size} windows, ${this.groups.size} groups`);

        return this.buildResult();
    }

    processCommand(type, data) {
        let offset = 0;

        try {
            switch (type) {
                case this.kCommandUpdateTabNavigation: {
                    if (data.length < 12) {
                        console.warn('UpdateTabNavigation command too short');
                        break;
                    }

                    const size = this.readUint32(data, offset);
                    offset += 4;

                    const id = this.readUint32(data, offset);
                    offset += 4;

                    const histIdx = this.readUint32(data, offset);
                    offset += 4;

                    const urlResult = this.readString(data, offset);
                    offset += urlResult.bytesRead;

                    const titleResult = this.readString16(data, offset);

                    const tab = this.getTab(id);
                    let histItem = tab.history.find(h => h.idx === histIdx);
                    
                    if (!histItem) {
                        histItem = { idx: histIdx, url: '', title: '' };
                        tab.history.push(histItem);
                    }

                    histItem.url = urlResult.value;
                    histItem.title = titleResult.value;
                    break;
                }

                case this.kCommandSetSelectedTabInIndex: {
                    if (data.length < 8) {
                        console.warn('SetSelectedTabInIndex command too short');
                        break;
                    }

                    const id = this.readUint32(data, offset);
                    offset += 4;
                    const idx = this.readUint32(data, offset);

                    this.getWindow(id).activeTabIdx = idx;
                    break;
                }

                case this.kCommandSetTabGroupMetadata2: {
                    if (data.length < 20) {
                        console.warn('SetTabGroupMetadata2 command too short');
                        break;
                    }

                    const size = this.readUint32(data, offset);
                    offset += 4;

                    const high = this.readUint64(data, offset);
                    offset += 8;
                    const low = this.readUint64(data, offset);
                    offset += 8;

                    const nameResult = this.readString16(data, offset);
                    this.getGroup(high, low).name = nameResult.value;
                    break;
                }

                case this.kCommandSetTabGroup: {
                    if (data.length < 24) {
                        console.warn('SetTabGroup command too short');
                        break;
                    }

                    const id = this.readUint32(data, offset);
                    offset += 4;
                    offset += 4; // Struct padding

                    const high = this.readUint64(data, offset);
                    offset += 8;
                    const low = this.readUint64(data, offset);

                    this.getTab(id).group = this.getGroup(high, low);
                    break;
                }

                case this.kCommandSetTabWindow: {
                    if (data.length < 8) {
                        console.warn('SetTabWindow command too short');
                        break;
                    }

                    const win = this.readUint32(data, offset);
                    offset += 4;
                    const id = this.readUint32(data, offset);

                    this.getTab(id).win = win;
                    break;
                }

                case this.kCommandWindowClosed: {
                    if (data.length < 4) {
                        console.warn('WindowClosed command too short');
                        break;
                    }

                    const id = this.readUint32(data, offset);
                    this.getWindow(id).deleted = true;
                    break;
                }

                case this.kCommandTabClosed: {
                    if (data.length < 4) {
                        console.warn('TabClosed command too short');
                        break;
                    }

                    const id = this.readUint32(data, offset);
                    this.getTab(id).deleted = true;
                    break;
                }

                case this.kCommandSetTabIndexInWindow: {
                    if (data.length < 8) {
                        console.warn('SetTabIndexInWindow command too short');
                        break;
                    }

                    const id = this.readUint32(data, offset);
                    offset += 4;
                    const index = this.readUint32(data, offset);

                    this.getTab(id).idx = index;
                    break;
                }

                case this.kCommandSetActiveWindow: {
                    if (data.length < 4) {
                        console.warn('SetActiveWindow command too short');
                        break;
                    }

                    const id = this.readUint32(data, offset);
                    this.activeWindow = this.getWindow(id);
                    break;
                }

                case this.kCommandSetSelectedNavigationIndex: {
                    if (data.length < 8) {
                        console.warn('SetSelectedNavigationIndex command too short');
                        break;
                    }

                    const id = this.readUint32(data, offset);
                    offset += 4;
                    const idx = this.readUint32(data, offset);

                    this.getTab(id).currentHistoryIdx = idx;
                    break;
                }

                case this.kCommandLastActiveTime: {
                    // TODO: Implement if needed
                    break;
                }

                default:
                    // Unknown command type, skip it
                    console.log(`Unknown command type: ${type}`);
                    break;
            }
        } catch (error) {
            console.warn(`Error processing command type ${type}:`, error);
        }
    }

    buildResult() {
        console.log('Building result...');
        
        // Sort tab history by index
        for (const tab of this.tabs.values()) {
            tab.history.sort((a, b) => a.idx - b.idx);
            
            const window = this.getWindow(tab.win);
            window.tabs.push(tab);
        }

        // Sort tabs in windows by index
        for (const window of this.windows.values()) {
            window.tabs.sort((a, b) => a.idx - b.idx);
        }

        // Build normalized result
        const windows = [];
        
        for (const window of this.windows.values()) {
            const resultWindow = {
                active: window === this.activeWindow && !window.deleted,
                deleted: window.deleted,
                tabs: []
            };
            
            let nonDeletedTabIndex = 0;
            for (const tab of window.tabs) {
                const groupName = tab.group ? tab.group.name : "";
                
                // A tab can only be active if:
                // 1. The tab is not deleted
                // 2. The window is not deleted 
                // 3. There's a valid active tab index set
                // 4. This tab's position matches the active tab index
                const isActive = !tab.deleted && !window.deleted && window.activeTabIdx >= 0 && nonDeletedTabIndex === window.activeTabIdx;
                
                const resultTab = {
                    active: isActive,
                    deleted: tab.deleted,
                    group: groupName,
                    history: [],
                    url: "",
                    title: ""
                };

                // Build history and find current URL/title
                for (const histItem of tab.history) {
                    resultTab.history.push({
                        url: histItem.url,
                        title: histItem.title
                    });
                    
                    if (histItem.idx === tab.currentHistoryIdx) {
                        resultTab.url = histItem.url;
                        resultTab.title = histItem.title;
                    }
                }

                resultWindow.tabs.push(resultTab);
                if (!tab.deleted) {
                    nonDeletedTabIndex++;
                }
            }

            windows.push(resultWindow);
        }

        console.log(`Built result with ${windows.length} windows`);
        return { windows };
    }

    reset() {
        this.tabs.clear();
        this.windows.clear();
        this.groups.clear();
        this.activeWindow = null;
    }
}

// Export for use in other files
window.SessionParser = SessionParser; 