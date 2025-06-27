// --- DATA PROCESSING, IMPORT/EXPORT, SEARCH & FILTER ---

function normalizeAbbreviation(abbr, unmapped) {
    if (!abbr) return '';
    if (state.customAbbreviationMappings && state.customAbbreviationMappings[abbr]) {
        return state.customAbbreviationMappings[abbr];
    }
    if (abbreviationMap[abbr]) {
        return abbreviationMap[abbr];
    }
    if (abbr.length > 0 && !/^\s*$/.test(abbr)) {
        unmapped[abbr] = (unmapped[abbr] || 0) + 1;
    }
    return abbr;
}

function generateTags(roomType, department) {
    const tags = new Set();
    tagRules.forEach(rule => {
        if (rule.pattern.test(roomType) || rule.pattern.test(department || '')) {
            tags.add(rule.tag);
        }
    });
    return Array.from(tags);
}

// ==================== ENHANCED SEARCH HELPER FUNCTIONS ====================

/**
 * Advanced query preprocessor that handles natural language patterns
 */
function preprocessSearchQuery(query) {
    if (!query || typeof query !== 'string') return [];
    
    const originalQuery = query.trim().toLowerCase();
    const processedTerms = [];
    
    // Floor pattern detection with comprehensive patterns
    const floorPatterns = [
        // "floor 3", "floor3", "floor-3"
        { regex: /(?:^|\s)floor[\s\-]?(\d+)(?:\s|$)/g, type: 'floor' },
        // "3rd floor", "2nd floor", "1st floor" 
        { regex: /(?:^|\s)(\d+)(?:st|nd|rd|th)?\s*floor(?:\s|$)/g, type: 'floor' },
        // "level 3", "level3", "lv 3", "lv3"
        { regex: /(?:^|\s)(?:level|lv)[\s\-]?(\d+)(?:\s|$)/g, type: 'floor' },
        // "f3", "f-3" (but not "ff" or single "f")
        { regex: /(?:^|\s)f[\s\-]?(\d+)(?:\s|$)/g, type: 'floor' },
        // Ordinal number words: "third floor", "second level"
        { regex: /(?:^|\s)(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s*(?:floor|level)(?:\s|$)/g, type: 'floor_word' }
    ];
    
    // Building pattern detection
    const buildingPatterns = [
        { regex: /(?:^|\s)(?:building|bldg)[\s\-:]?\s*([a-zA-Z0-9\-\s]+?)(?:\s|$)/g, type: 'building' },
        { regex: /(?:^|\s)(?:in|at)\s+([a-zA-Z0-9\-\s]+?)(?:\s+(?:building|bldg)|$)/g, type: 'building' }
    ];
    
    // Department/type patterns
    const departmentPatterns = [
        { regex: /(?:^|\s)(?:dept|department)[\s\-:]?\s*([a-zA-Z0-9\-\s]+?)(?:\s|$)/g, type: 'department' },
        { regex: /(?:^|\s)(?:type|room\s*type)[\s\-:]?\s*([a-zA-Z0-9\-\s]+?)(?:\s|$)/g, type: 'room_type' }
    ];
    
    // Staff/occupant patterns
    const staffPatterns = [
        { regex: /(?:^|\s)(?:staff|person|occupant)[\s\-:]?\s*([a-zA-Z\s\-\.]+?)(?:\s|$)/g, type: 'staff' },
        { regex: /(?:^|\s)(?:dr|doctor|prof|professor)[\s\.]?\s*([a-zA-Z\s\-\.]+?)(?:\s|$)/g, type: 'staff' }
    ];
    
    let remainingQuery = originalQuery;
    
    // Process floor patterns first (highest priority)
    floorPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.regex.exec(originalQuery)) !== null) {
            if (pattern.type === 'floor_word') {
                const floorNumber = convertWordToNumber(match[1]);
                if (floorNumber !== null) {
                    processedTerms.push({
                        type: 'floor',
                        value: floorNumber.toString(),
                        original: match[0].trim(),
                        boost: 2.0
                    });
                }
            } else {
                processedTerms.push({
                    type: 'floor',
                    value: match[1],
                    original: match[0].trim(),
                    boost: 2.0
                });
            }
            // Remove matched pattern from remaining query
            remainingQuery = remainingQuery.replace(match[0], ' ');
        }
        pattern.regex.lastIndex = 0; // Reset regex
    });
    
    // Process building patterns
    buildingPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.regex.exec(originalQuery)) !== null) {
            processedTerms.push({
                type: 'building',
                value: match[1].trim(),
                original: match[0].trim(),
                boost: 1.5
            });
            remainingQuery = remainingQuery.replace(match[0], ' ');
        }
        pattern.regex.lastIndex = 0;
    });
    
    // Process department patterns
    departmentPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.regex.exec(originalQuery)) !== null) {
            processedTerms.push({
                type: pattern.type === 'department' ? 'department' : 'room_type',
                value: match[1].trim(),
                original: match[0].trim(),
                boost: 1.3
            });
            remainingQuery = remainingQuery.replace(match[0], ' ');
        }
        pattern.regex.lastIndex = 0;
    });
    
    // Process staff patterns
    staffPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.regex.exec(originalQuery)) !== null) {
            processedTerms.push({
                type: 'staff',
                value: match[1].trim(),
                original: match[0].trim(),
                boost: 1.2
            });
            remainingQuery = remainingQuery.replace(match[0], ' ');
        }
        pattern.regex.lastIndex = 0;
    });
    
    // Process remaining terms as general search
    const remainingTerms = remainingQuery
        .split(/[\s,]+/)
        .map(term => term.trim())
        .filter(term => term.length > 0)
        .filter(term => !/^(the|and|or|in|at|on|of|for|to|with|by)$/.test(term)); // Remove common stop words
    
    remainingTerms.forEach(term => {
        // Check if it's a potential room number (numeric or alphanumeric)
        if (/^\d+[a-zA-Z]?$/.test(term) || /^[a-zA-Z]\d+$/.test(term)) {
            processedTerms.push({
                type: 'room_number',
                value: term,
                original: term,
                boost: 3.0 // Room numbers get highest boost
            });
        } else {
            processedTerms.push({
                type: 'general',
                value: term,
                original: term,
                boost: 1.0
            });
        }
    });
    
    return processedTerms;
}

/**
 * Convert ordinal words to numbers
 */
function convertWordToNumber(word) {
    const wordMap = {
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
        'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
        'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15
    };
    return wordMap[word.toLowerCase()] || null;
}

/**
 * Helper functions for enhanced floor tagging
 */
function getOrdinalSuffix(num) {
    const remainder = num % 100;
    if (remainder >= 11 && remainder <= 13) return 'th';
    switch (num % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function numberToWord(num) {
    const words = {
        1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth',
        6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth',
        11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth', 15: 'fifteenth'
    };
    return words[num] || null;
}

/**
 * FIXED: Calculate match score for a specific term against a room
 */
function calculateTermMatch(term, room, roomTags) {
    const termValue = term.value.toLowerCase();
    let score = 0;
    let matched = false;
    
    switch (term.type) {
        case 'floor':
            if (room.floor !== undefined && room.floor !== null) {
                if (room.floor.toString() === termValue) {
                    score = 10; // Perfect floor match
                    matched = true;
                }
            }
            break;
            
        case 'building':
            // FIXED: Check both building fields with flexible matching
            const buildingFields = [
                room.building,
                room.bld_descrshort
            ].filter(Boolean);
            
            for (let buildingField of buildingFields) {
                const buildingLower = buildingField.toLowerCase();
                if (buildingLower === termValue) {
                    score = 10; // Exact match
                    matched = true;
                    break;
                } else if (buildingLower.includes(termValue) && termValue.length >= 2) {
                    score = Math.max(score, 7); // Partial match
                    matched = true;
                } else if (termValue.includes(buildingLower) && buildingLower.length >= 2) {
                    score = Math.max(score, 6); // Reverse partial match
                    matched = true;
                }
            }
            break;
            
        case 'department':
            if (room.dept_descr) {
                const deptLower = room.dept_descr.toLowerCase();
                if (deptLower === termValue) {
                    score = 10;
                    matched = true;
                } else if (deptLower.includes(termValue) && termValue.length >= 2) {
                    score = 6;
                    matched = true;
                }
            }
            break;
            
        case 'room_type':
            if (room.typeFull) {
                const typeLower = room.typeFull.toLowerCase();
                if (typeLower === termValue) {
                    score = 10;
                    matched = true;
                } else if (typeLower.includes(termValue) && termValue.length >= 2) {
                    score = 6;
                    matched = true;
                }
            }
            break;
            
        case 'room_number':
            if (room.rmnbr) {
                const roomNum = room.rmnbr.toString().toLowerCase();
                if (roomNum === termValue) {
                    score = 15; // Highest score for exact room number
                    matched = true;
                } else if (roomNum.includes(termValue) && termValue.length >= 2) {
                    score = 8;
                    matched = true;
                }
            }
            break;
            
        case 'staff':
            const staffTags = state.staffTags[room.id] || [];
            for (let staffTag of staffTags) {
                const staffName = staffTag.replace('Staff: ', '').toLowerCase();
                if (staffName.includes(termValue) && termValue.length >= 2) {
                    score = staffName === termValue ? 10 : 6;
                    matched = true;
                    break;
                }
            }
            break;
            
        case 'general':
        default:
            // FIXED: More flexible general term matching
            for (let tag of roomTags) {
                const tagLower = tag.toLowerCase();
                if (tagLower === termValue) {
                    score = 8; // Exact match
                    matched = true;
                    break;
                } else if (tagLower.includes(termValue) && termValue.length >= 2) {
                    score = Math.max(score, 4); // Partial match
                    matched = true;
                } else if (termValue.includes(tagLower) && tagLower.length >= 2) {
                    score = Math.max(score, 3); // Reverse partial match  
                    matched = true;
                } else if (termValue.length >= 2 && tagLower.startsWith(termValue)) {
                    score = Math.max(score, 3); // Prefix match
                    matched = true;
                }
            }
            break;
    }
    
    return { matched, score };
}

// ==================== FILE PARSING FUNCTIONS ====================

async function parseFile(file) {
    const fileType = file.name.split('.').pop().toLowerCase();
    updateLoadingStatus(`Parsing ${file.name}...`);
    if (fileType === 'csv') {
        const text = await file.text();
        return Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true }).data;
    } else if (['xlsx', 'xls'].includes(fileType)) {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab);
        return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    }
    throw new Error('Unsupported file type for parsing.');
}

async function processRoomData(data) {
    updateLoadingStatus('Processing room data...');
    const processed = [];
    const unmapped = {};
    const buildings = new Set();
    const floors = new Set();
    const tags = new Set();
    let uniqueIdCounter = state.processedData.length;
    
    // Create a Map of existing rooms for quick duplicate checking
    const existingRoomsMap = new Map();
    state.processedData.forEach(room => {
        if (room.rmrecnbr) {
            existingRoomsMap.set(room.rmrecnbr.toString(), room);
        }
    });
    
    // Track processed room record numbers in this batch to avoid duplicates within the new data
    const processedInBatch = new Set();
    let duplicatesSkipped = 0;
    let duplicatesUpdated = 0;

    data.forEach((row) => {
        if (!row.rmnbr || typeof row.floor === 'undefined' || row.floor === null) {
             console.warn('Skipping row due to missing rmnbr or floor:', row);
             return;
        }

        // Check for duplicates using rmrecnbr as unique identifier
        const roomKey = row.rmrecnbr ? row.rmrecnbr.toString() : `${row.rmnbr}_${row.floor}_${row.bld_descrshort || 'unknown'}`;
        
        // Skip if we've already processed this room in this batch
        if (processedInBatch.has(roomKey)) {
            duplicatesSkipped++;
            console.log(`Duplicate in batch skipped: ${roomKey}`);
            return;
        }
        
        // FIXED: Consistent building handling
        const building = (row.bld_descrshort || row.building || 'Unknown Building').trim();
        buildings.add(building);

        const type = normalizeAbbreviation(row.rmtyp_descrshort, unmapped);
        const sub = normalizeAbbreviation(row.rmsubtyp_descrshort, unmapped);
        const normalizedDept = normalizeAbbreviation(row.dept_descr, unmapped); // Normalize department

        let full = type;
        if (sub && type !== sub) {
            full = `${type} - ${sub}`;
        }
        if (fullReplacements[`${type} ${sub}`.trim()]) {
            full = fullReplacements[`${type} ${sub}`.trim()];
        } else if (type === sub) {
            full = type;
        }

        const rowTags = generateTags(full, normalizedDept); // Use normalized department
        rowTags.forEach(t => tags.add(t));
        floors.add(row.floor.toString());

        const processedRoom = {
            ...row,
            id: uniqueIdCounter++,
            typeFull: full,
            dept_descr: normalizedDept, // Store the normalized department name
            tags: rowTags,
            mgisLink: generateMgisLink(row),
            building: building, // FIXED: Always use the consistent building value
            bld_descrshort: row.bld_descrshort || building // Keep original for reference
        };

        // Check if this room already exists in the current data
        if (row.rmrecnbr && existingRoomsMap.has(row.rmrecnbr.toString())) {
            // Update existing room with new data
            const existingRoom = existingRoomsMap.get(row.rmrecnbr.toString());
            const existingIndex = state.processedData.findIndex(r => r.id === existingRoom.id);
            
            if (existingIndex !== -1) {
                // Preserve the original ID and any custom/staff tags
                processedRoom.id = existingRoom.id;
                state.processedData[existingIndex] = processedRoom;
                duplicatesUpdated++;
                console.log(`Room updated: ${roomKey}`);
            }
        } else {
            // Add new room
            processed.push(processedRoom);
        }
        
        processedInBatch.add(roomKey);
    });

    const buildingsArray = Array.from(buildings);
    buildingsArray.forEach((b, index) => {
        if (!state.buildingColors[b]) {
            state.buildingColors[b] = assignBuildingColor(b, Object.keys(state.buildingColors).length); // Direct call to ui.js function
        }
    });

    // Only add new rooms (not duplicates)
    state.processedData = state.processedData.concat(processed);
    state.unmappedAbbreviations = { ...state.unmappedAbbreviations, ...unmapped };

    state.availableBuildings = [...new Set([...state.availableBuildings, ...buildingsArray])].sort();
    state.availableFloors = [...new Set([...state.availableFloors, ...Array.from(floors)])].sort((a, b) => Number(a) - Number(b));
    state.availableTags = [...new Set([...state.availableTags, ...Array.from(tags)])].sort();
    state.currentPage = 1;

    // Log deduplication results
    if (duplicatesSkipped > 0 || duplicatesUpdated > 0) {
        console.log(`✅ Deduplication complete: ${duplicatesSkipped} duplicates skipped, ${duplicatesUpdated} rooms updated, ${processed.length} new rooms added`);
        addError(`Deduplication: ${duplicatesSkipped} duplicates skipped, ${duplicatesUpdated} rooms updated, ${processed.length} new rooms added`);
    }

    updateLoadingStatus('Creating search index...');
    await createSearchIndex();
}

async function processOccupantData(data) {
    updateLoadingStatus('Processing occupant data...');
    data.forEach(occ => {
        if (!occ.rmrecnbr || !occ.person_name) return;
        const room = state.processedData.find(r => String(r.rmrecnbr) === String(occ.rmrecnbr));
        if (room) {
            if (!state.staffTags[room.id]) {
                state.staffTags[room.id] = [];
            }
            const staffTag = `Staff: ${occ.person_name.trim()}`;
            if (!state.staffTags[room.id].includes(staffTag)) {
                state.staffTags[room.id].push(staffTag);
            }
        }
    });
    state.currentPage = 1;
    await createSearchIndex();
}

async function processRoomDataFiles(files) {
    let allRoomData = [];
    for (const file of files) {
        try {
            const data = await parseFile(file);
            allRoomData = allRoomData.concat(data);
            state.loadedFiles.push({ name: file.name, type: 'room', rows: data.length, status: 'processed' });
        } catch (e) {
            addError(`Room Data Error (${file.name}): ${e.message}`);
            state.loadedFiles.push({ name: file.name, type: 'room', status: 'error', message: e.message });
        }
    }
    if (allRoomData.length > 0) {
        await processRoomData(allRoomData);
    }
}

async function processOccupantDataFiles(files) {
    let allOccupantData = [];
    for (const file of files) {
        try {
            const data = await parseFile(file);
            allOccupantData = allOccupantData.concat(data);
            state.loadedFiles.push({ name: file.name, type: 'occupant', rows: data.length, status: 'processed' });
        } catch (e) {
            addError(`Occupant Data Error (${file.name}): ${e.message}`);
            state.loadedFiles.push({ name: file.name, type: 'occupant', status: 'error', message: e.message });
        }
    }
    if (allOccupantData.length > 0) {
        await processOccupantData(allOccupantData);
    }
}

async function handleFiles(files) {
    showLoading(true);
    setProcessingState(true, elements.processingIndicator);
    clearErrors();
    let roomDataFiles = [], occupantDataFiles = [], tagFiles = [], sessionFiles = [];

    for (const file of files) {
        const fileType = file.name.split('.').pop().toLowerCase();
        if (fileType === 'json') {
            tagFiles.push(file);
        } else if (fileType === 'umsess') {
            sessionFiles.push(file);
        } else if (['xlsx', 'xls', 'csv'].includes(fileType)) {
            if (file.name.toLowerCase().includes('occupant') || file.name.toLowerCase().includes('staff')) {
                occupantDataFiles.push(file);
            } else {
                roomDataFiles.push(file);
            }
        } else {
            addError(`Unsupported file type: ${file.name}`);
            state.loadedFiles.push({ name: file.name, type: 'unsupported', status: 'error', message: 'Unsupported type' });
        }
    }

    if (sessionFiles.length > 0) {
        for (const sessionFile of sessionFiles) {
            await importSession(sessionFile);
        }
    }
    if (roomDataFiles.length > 0) {
        await processRoomDataFiles(roomDataFiles);
    }
    if (occupantDataFiles.length > 0) {
        await processOccupantDataFiles(occupantDataFiles);
    }
    for (const tagFile of tagFiles) {
        await importCustomTags(tagFile);
    }

    updateFilesListUI(); // Direct call to ui.js function
    updateDataSummary(); // Direct call to ui.js function
    await updateUI();      // Direct call to ui.js function

    if(state.processedData.length > 0) {
        enableDependentFeatures(); // Direct call to ui.js function
        updateUploadAreaState(); // Direct call to ui.js function
    }

    if (state.processedData.length > 0 || Object.keys(state.customTags).length > 0) {
        showSecurityReminder(); // Direct call to app.js function (made global)
    }

    showLoading(false);
    setProcessingState(false, elements.processingIndicator);
}

// ==================== EXPORT/IMPORT FUNCTIONS ====================

function exportCustomTags() {
    if (Object.keys(state.customTags).length === 0) {
        addError("No custom tags to export.");
        return;
    }
    const exportData = {
        version: "1.2",
        timestamp: new Date().toISOString(),
        customTags: {},
        roomReference: {}
    };

    Object.keys(state.customTags).forEach(roomId => {
        const room = state.processedData.find(r => r.id.toString() === roomId.toString());
        if (room && state.customTags[roomId] && state.customTags[roomId].length > 0) {
            exportData.customTags[roomId] = state.customTags[roomId];
            exportData.roomReference[roomId] = {
                rmnbr: room.rmnbr,
                typeFull: room.typeFull,
                rmrecnbr: room.rmrecnbr,
                building: room.bld_descrshort
            };
        }
    });

    if (Object.keys(exportData.customTags).length === 0) {
        addError("No valid custom tags found on currently loaded rooms to export.");
        return;
    }
    downloadFile(JSON.stringify(exportData, null, 2), `custom_tags_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

async function importCustomTags(file) {
    showLoading(true);
    setProcessingState(true, elements.processingIndicator);
    clearErrors();
    try {
        const text = await file.text();
        const importData = JSON.parse(text);
        if (!importData.customTags) throw new Error("Invalid tags file: missing customTags data.");

        let importedCount = 0;
        let skippedCount = 0;

        Object.keys(importData.customTags).forEach(roomIdFromFile => {
            const tagsToImport = importData.customTags[roomIdFromFile];
            if (!Array.isArray(tagsToImport) || tagsToImport.length === 0) return;

            let targetRoom = null;
            const roomRef = importData.roomReference ? importData.roomReference[roomIdFromFile] : null;

            if (roomRef && roomRef.rmrecnbr) targetRoom = state.processedData.find(r => String(r.rmrecnbr) === String(roomRef.rmrecnbr));
            if (!targetRoom) targetRoom = state.processedData.find(r => r.id.toString() === roomIdFromFile.toString());
            if (!targetRoom && roomRef && roomRef.rmnbr && roomRef.building) targetRoom = state.processedData.find(r => r.rmnbr === roomRef.rmnbr && (r.bld_descrshort === roomRef.building || r.building === roomRef.building));
            if (!targetRoom && roomRef && roomRef.rmnbr) targetRoom = state.processedData.find(r => r.rmnbr === roomRef.rmnbr);

            if (targetRoom) {
                if (!state.customTags[targetRoom.id]) state.customTags[targetRoom.id] = [];
                tagsToImport.forEach(tagFromFile => {
                    let richTagObject = (typeof tagFromFile === 'string') ?
                        createRichTag(tagFromFile, 'simple', '', '', '', '', 'blue') :
                        createRichTag(tagFromFile.name, tagFromFile.type, tagFromFile.description, tagFromFile.link, tagFromFile.contact, tagFromFile.imageUrl, tagFromFile.color);
                    if (!state.customTags[targetRoom.id].some(existingTag => existingTag.name === richTagObject.name)) {
                        state.customTags[targetRoom.id].push(richTagObject);
                        importedCount++;
                    }
                });
            } else {
                skippedCount++;
            }
        });
        if (importedCount > 0) console.log(`✅ Imported/Updated ${importedCount} custom tags. Skipped ${skippedCount}.`);
        else addError("No new tags imported/updated.");
        await createSearchIndex();
    } catch (e) {
        addError(`Tags Import Error: ${e.message}`);
        console.error(e);
    } finally {
        showLoading(false);
        setProcessingState(false, elements.processingIndicator);
    }
}

function exportSession() {
    if (state.processedData.length === 0 && Object.keys(state.customTags).length === 0) {
        addError("No session data to export.");
        return;
    }
    const sessionData = {
        version: "1.1", timestamp: new Date().toISOString(), type: "um_session",
        data: {
            processedData: state.processedData, customTags: state.customTags, staffTags: state.staffTags,
            buildingColors: state.buildingColors, activeFilters: state.activeFilters,
            searchQuery: state.searchQuery, currentViewMode: state.currentViewMode, resultsPerPage: state.resultsPerPage
        }
    };
    try {
        const jsonString = JSON.stringify(sessionData);
        const compressedData = btoa(unescape(encodeURIComponent(jsonString)));
        downloadFile(compressedData, `hospital_directory_session_${new Date().toISOString().split('T')[0]}.umsess`, 'application/octet-stream');
        console.log(`📦 Session exported.`);
    } catch (error) {
        addError("Error preparing session data for export: " + error.message);
        console.error("Session export error:", error);
    }
}

async function importSession(file) {
    showLoading(true);
    setProcessingState(true, elements.processingIndicator);
    clearErrors();
    try {
        const compressedData = await file.text();
        const jsonString = decodeURIComponent(escape(atob(compressedData)));
        const sessionData = JSON.parse(jsonString);
        if (!sessionData.type || sessionData.type !== "um_session") throw new Error("Invalid session file format.");

        state.processedData = sessionData.data.processedData || [];
        state.customTags = sessionData.data.customTags || {};
        state.staffTags = sessionData.data.staffTags || {};
        state.buildingColors = sessionData.data.buildingColors || {};
        state.activeFilters = sessionData.data.activeFilters || { building: '', floor: '', tags: [] };
        state.searchQuery = sessionData.data.searchQuery || '';
        state.currentViewMode = sessionData.data.currentViewMode || 'desktop';
        state.resultsPerPage = sessionData.data.resultsPerPage || 10;
        state.currentPage = 1;

        state.availableBuildings = [...new Set(state.processedData.map(r => r.building || r.bld_descrshort || 'Unknown'))].sort();
        state.availableFloors = [...new Set(state.processedData.map(r => (r.floor !== null && typeof r.floor !== 'undefined') ? r.floor.toString() : 'N/A'))].sort((a, b) => (a === 'N/A') ? 1 : (b === 'N/A') ? -1 : Number(a) - Number(b));
        state.availableTags = [...new Set(state.processedData.flatMap(r => r.tags || []))].sort();

        if (elements.searchInput) elements.searchInput.value = state.searchQuery;
        if (elements.searchInputMobile) elements.searchInputMobile.value = state.searchQuery;

        state.loadedFiles.push({ name: file.name, type: 'session', status: 'processed' });
        await createSearchIndex();
        console.log(`✅ Session restored.`);
    } catch (e) {
        addError(`Session Import Error (${file.name}): ${e.message}`);
        console.error(e);
    } finally {
        showLoading(false);
        setProcessingState(false, elements.processingIndicator);
    }
}

// ==================== ENHANCED UNIFIED SEARCH ARCHITECTURE ====================

// Enhanced unified tag structure for each room
function createUnifiedTags(room) {
    const tags = [];
    
    // Building tags (enhanced with variations)
    if (room.building) {
        const building = room.building.toLowerCase();
        tags.push(building);
        tags.push(`building:${building}`);
        tags.push(`bldg:${building}`);
        // Add individual words from building name
        building.split(/[\s\-]+/).forEach(word => {
            if (word.length > 1) tags.push(word);
        });
    }
    if (room.bld_descrshort && room.bld_descrshort !== room.building) {
        const bldShort = room.bld_descrshort.toLowerCase();
        tags.push(bldShort);
        tags.push(`building:${bldShort}`);
        bldShort.split(/[\s\-]+/).forEach(word => {
            if (word.length > 1) tags.push(word);
        });
    }
    
    // Enhanced floor tags with natural language variations
    if (room.floor !== undefined && room.floor !== null) {
        const floor = room.floor.toString();
        
        // Basic floor tags
        tags.push(floor);
        tags.push(`floor:${floor}`);
        tags.push(`f${floor}`);
        tags.push(`level:${floor}`);
        
        // Natural language floor tags
        tags.push(`floor ${floor}`);
        tags.push(`level ${floor}`);
        tags.push(`${floor}${getOrdinalSuffix(parseInt(floor))} floor`);
        
        // Word-based floor tags for common floors
        const floorWord = numberToWord(parseInt(floor));
        if (floorWord) {
            tags.push(`${floorWord} floor`);
            tags.push(`${floorWord} level`);
        }
    }
    
    // Department tags (enhanced)
    if (room.dept_descr) {
        const dept = room.dept_descr.toLowerCase();
        tags.push(dept);
        tags.push(`department:${dept}`);
        tags.push(`dept:${dept}`);
        // Add individual words from department
        dept.split(/[\s\-\/]+/).forEach(word => {
            if (word.length > 2) tags.push(word);
        });
    }
    
    // Room type tags (enhanced)
    if (room.typeFull) {
        const type = room.typeFull.toLowerCase();
        tags.push(type);
        tags.push(`type:${type}`);
        tags.push(`room:${type}`);
        // Add individual words from room type
        type.split(/[\s\-\/]+/).forEach(word => {
            if (word.length > 2) tags.push(word);
        });
    }
    
    // System-generated category tags
    if (room.tags) {
        room.tags.forEach(tag => {
            const tagLower = tag.toLowerCase();
            tags.push(tagLower);
            tags.push(`category:${tagLower}`);
            // Add individual words from tags
            tagLower.split(/[\s\-]+/).forEach(word => {
                if (word.length > 2) tags.push(word);
            });
        });
    }
    
    // Custom tags (enhanced)
    const customTags = state.customTags[room.id] || [];
    customTags.forEach(tagObj => {
        if (tagObj.name) {
            const name = tagObj.name.toLowerCase();
            tags.push(name);
            tags.push(`custom:${name}`);
            // Add individual words from custom tag names
            name.split(/\s+/).forEach(word => {
                if (word.length > 1) tags.push(word);
            });
        }
        if (tagObj.type) {
            tags.push(`tagtype:${tagObj.type.toLowerCase()}`);
        }
        if (tagObj.color) {
            tags.push(`color:${tagObj.color.toLowerCase()}`);
        }
    });
    
    // Enhanced staff tags
    const staffTags = state.staffTags[room.id] || [];
    staffTags.forEach(staffTag => {
        const name = staffTag.replace('Staff: ', '').toLowerCase();
        tags.push(name);
        tags.push(`staff:${name}`);
        tags.push(`person:${name}`);
        tags.push(`occupant:${name}`);
        // Add individual name parts
        name.split(/\s+/).forEach(namePart => {
            if (namePart.length > 1) tags.push(namePart);
        });
    });
    
    // Room number variations (enhanced)
    if (room.rmnbr) {
        const roomNum = room.rmnbr.toString().toLowerCase();
        tags.push(roomNum);
        tags.push(`room:${roomNum}`);
        tags.push(`number:${roomNum}`);
        // Add partial room number matches for longer room numbers
        if (roomNum.length > 2) {
            for (let i = 2; i <= roomNum.length; i++) {
                tags.push(roomNum.substring(0, i));
            }
        }
    }
    
    return [...new Set(tags)]; // Remove duplicates
}

// FIXED: Enhanced search that uses structured query processing
function searchRoomsByTags(searchQuery) {
    if (!searchQuery || !state.processedData.length) {
        return [...state.processedData];
    }
    
    const processedTerms = preprocessSearchQuery(searchQuery);
    
    if (processedTerms.length === 0) {
        return [...state.processedData];
    }
    
    // Score and rank results
    const scoredResults = state.processedData.map(room => {
        const roomTags = createUnifiedTags(room);
        let score = 0;
        let matchedTerms = 0;
        const matchDetails = [];
        
        processedTerms.forEach(term => {
            const matchResult = calculateTermMatch(term, room, roomTags);
            if (matchResult.matched) {
                score += matchResult.score * term.boost;
                matchedTerms++;
                matchDetails.push({
                    term: term.original,
                    type: term.type,
                    score: matchResult.score,
                    boost: term.boost
                });
            }
        });
        
        // FIXED: More flexible matching - require at least 70% of terms to match for inclusion
        // For single term searches, require 100% match
        const matchThreshold = processedTerms.length === 1 ? 1 : Math.ceil(processedTerms.length * 0.7);
        const sufficientMatch = matchedTerms >= matchThreshold;
        
        // Boost score for exact room number matches
        if (processedTerms.some(t => t.type === 'room_number' && room.rmnbr && 
            room.rmnbr.toString().toLowerCase() === t.value.toLowerCase())) {
            score *= 2;
        }
        
        return {
            room,
            score: sufficientMatch ? score : 0,
            matchedTerms,
            totalTerms: processedTerms.length,
            matchDetails,
            included: sufficientMatch
        };
    });
    
    // Filter and sort results
    return scoredResults
        .filter(result => result.included)
        .sort((a, b) => b.score - a.score)
        .map(result => result.room);
}

// FIXED: Simplified filter function that properly combines search and dropdown filters
function data_getFilteredData() {
    // Start with search results or all data if no search query
    let result = searchRoomsByTags(state.searchQuery);
    
    // FIXED: Apply dropdown filters AFTER search, not as a separate search
    if (state.activeFilters.building) {
        result = result.filter(r => {
            const roomBuilding = (r.building || r.bld_descrshort || '').toLowerCase();
            const filterBuilding = state.activeFilters.building.toLowerCase();
            return roomBuilding === filterBuilding;
        });
    }
    
    if (state.activeFilters.floor) {
        result = result.filter(r => String(r.floor) === String(state.activeFilters.floor));
    }
    
    // FIXED: Apply tag filters properly without re-running entire search
    if (state.activeFilters.tags.length > 0) {
        result = result.filter(room => {
            const roomTags = createUnifiedTags(room);
            return state.activeFilters.tags.every(filterTag => {
                return roomTags.some(roomTag => 
                    roomTag.toLowerCase().includes(filterTag.toLowerCase()) ||
                    filterTag.toLowerCase().includes(roomTag.toLowerCase())
                );
            });
        });
    }
    
    state.currentFilteredData = result;
    return result;
}

// Helper function to capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Enhanced autocomplete that suggests all types of tags
function buildAutocompleteList() {
    const suggestions = new Set();
    const limit = 5000;
    
    // Add floor-specific suggestions
    const floors = [...new Set(state.processedData.map(r => r.floor).filter(f => f !== null && f !== undefined))];
    floors.forEach(floor => {
        if (suggestions.size < limit) {
            suggestions.add(`floor ${floor}`);
            suggestions.add(`${floor}${getOrdinalSuffix(floor)} floor`);
            suggestions.add(`level ${floor}`);
            suggestions.add(`f${floor}`);
            
            const floorWord = numberToWord(floor);
            if (floorWord) {
                suggestions.add(`${floorWord} floor`);
            }
        }
    });
    
    // Add building suggestions
    const buildings = [...new Set(state.processedData.map(r => r.building || r.bld_descrshort).filter(Boolean))];
    buildings.forEach(building => {
        if (suggestions.size < limit) {
            suggestions.add(building.toLowerCase());
            suggestions.add(`building ${building.toLowerCase()}`);
        }
    });
    
    // Add existing unified tags
    state.processedData.forEach(room => {
        if (suggestions.size >= limit) return;
        
        const tags = createUnifiedTags(room);
        tags.forEach(tag => {
            if (suggestions.size < limit) {
                suggestions.add(tag);
            }
        });
        
        // Add room number
        if (room.rmnbr && suggestions.size < limit) {
            suggestions.add(room.rmnbr.toString());
        }
    });
    
    state.autocompleteItems = Array.from(suggestions).sort();
}

// Enhanced search index creation
async function createSearchIndex() {
    if (state.processedData.length === 0) {
        state.fuse = null;
        buildAutocompleteList();
        return;
    }
    
    // Create enhanced data for Fuse with unified tags
    const dataForIndex = state.processedData.map(r => ({
        ...r,
        unifiedTags: createUnifiedTags(r).join(' '),
        rmnbrStr: r.rmnbr ? r.rmnbr.toString() : ''
    }));
    
    // Simplified Fuse configuration focusing on unified tags
    state.fuse = new Fuse(dataForIndex, {
        keys: [
            { name: 'rmnbrStr', weight: 3.0 },
            { name: 'unifiedTags', weight: 2.0 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
        useExtendedSearch: true,
        includeMatches: true,
        minMatchCharLength: 1
    });
    
    buildAutocompleteList();
}

function updateAutocomplete(query) {
    if (!elements.autocompleteContainer || !query || query.length < 1) {
        hideAutocomplete();
        return;
    }
    
    let matches = [];
    const lowerQuery = query.toLowerCase();
    const stringItems = state.autocompleteItems.filter(item => typeof item === 'string' && item.length > 0);

    if (/^\d/.test(query)) {
        // For queries starting with numbers, prioritize exact matches
        matches = stringItems.filter(i => i.toLowerCase().startsWith(lowerQuery) || i.toLowerCase() === lowerQuery).slice(0, 10);
    } else {
        // For text queries, show starts-with first, then contains
        const startsWith = stringItems.filter(i => i.toLowerCase().startsWith(lowerQuery)).slice(0, 5);
        const includes = stringItems.filter(i => !i.toLowerCase().startsWith(lowerQuery) && i.toLowerCase().includes(lowerQuery)).slice(0, 5);
        matches = [...startsWith, ...includes];
    }

    elements.autocompleteContainer.innerHTML = '';
    if (matches.length === 0) {
        hideAutocomplete();
        return;
    }

    matches.forEach((item, idx) => {
        const clone = elements.autocompleteItemTemplate.content.cloneNode(true);
        const div = clone.querySelector('div');
        div.textContent = item;
        div.id = `ac-item-${idx}`;
        div.dataset.item = item;
        elements.autocompleteContainer.appendChild(clone);
    });
    
    elements.autocompleteContainer.classList.remove('hidden');
    state.autocompleteActiveIndex = -1;
}

function hideAutocomplete() {
    if (elements.autocompleteContainer) elements.autocompleteContainer.classList.add('hidden');
}

function handleAutocompleteKeydown(e) {
    if (!elements.autocompleteContainer || elements.autocompleteContainer.classList.contains('hidden')) return;
    const items = elements.autocompleteContainer.querySelectorAll('[role="option"]');
    if (items.length === 0) return;
    let newIndex = state.autocompleteActiveIndex;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = (state.autocompleteActiveIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = (state.autocompleteActiveIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (newIndex > -1 && items[newIndex]) {
            const selectedValue = items[newIndex].dataset.item;
            elements.searchInput.value = selectedValue;
            if (elements.searchInputMobile) elements.searchInputMobile.value = selectedValue;
            state.searchQuery = selectedValue;
            hideAutocomplete();
            state.currentPage = 1;
            updateResults(); // Direct call to ui.js function
        }
        return;
    } else if (e.key === 'Escape') {
        hideAutocomplete();
        return;
    } else {
        return;
    }

    if (state.autocompleteActiveIndex > -1 && items[state.autocompleteActiveIndex]) {
        items[state.autocompleteActiveIndex].classList.remove('bg-um-maize-light');
        items[state.autocompleteActiveIndex].removeAttribute('aria-selected');
    }
    if (items[newIndex]) {
        items[newIndex].classList.add('bg-um-maize-light');
        items[newIndex].setAttribute('aria-selected', 'true');
    }
    state.autocompleteActiveIndex = newIndex;
}

// ==================== DEBUGGING FUNCTIONS ====================

// Debug search for a specific query
function debugSearch(query) {
    console.log(`🔍 Debugging search for: "${query}"`);
    
    const processedTerms = preprocessSearchQuery(query);
    console.log('📝 Processed terms:', processedTerms);
    
    const results = searchRoomsByTags(query);
    console.log(`📊 Found ${results.length} results`);
    
    // Show first few results with scoring details
    const scoredResults = state.processedData.slice(0, 10).map(room => {
        const roomTags = createUnifiedTags(room);
        let score = 0;
        let matchedTerms = 0;
        
        processedTerms.forEach(term => {
            const matchResult = calculateTermMatch(term, room, roomTags);
            if (matchResult.matched) {
                score += matchResult.score * term.boost;
                matchedTerms++;
            }
        });
        
        return {
            room: `${room.rmnbr} - ${room.building}`,
            score,
            matchedTerms,
            totalTerms: processedTerms.length,
            tags: roomTags.slice(0, 10) // First 10 tags
        };
    });
    
    console.table(scoredResults);
    return results;
}

// Debug building data consistency
function debugBuildings() {
    console.log('🏢 Building Debug Info:');
    
    const buildingData = state.processedData.slice(0, 20).map(room => ({
        room: room.rmnbr,
        building: room.building,
        bld_descrshort: room.bld_descrshort,
        consistent: room.building === room.bld_descrshort
    }));
    
    console.table(buildingData);
    
    console.log('🏢 Available Buildings:', state.availableBuildings);
    console.log('🏢 Building Colors:', state.buildingColors);
}

// Debug tags for a specific room
function debugRoomTags(roomNumber) {
    const room = state.processedData.find(r => r.rmnbr.toString() === roomNumber.toString());
    if (!room) {
        console.log(`❌ Room ${roomNumber} not found`);
        return;
    }
    
    console.log(`🏠 Debug tags for room ${roomNumber}:`);
    console.log('📍 Room data:', {
        id: room.id,
        rmnbr: room.rmnbr,
        building: room.building,
        bld_descrshort: room.bld_descrshort,
        floor: room.floor,
        typeFull: room.typeFull,
        dept_descr: room.dept_descr
    });
    
    const unifiedTags = createUnifiedTags(room);
    console.log('🏷️ Unified tags:', unifiedTags);
    
    const customTags = state.customTags[room.id] || [];
    const staffTags = state.staffTags[room.id] || [];
    console.log('🏷️ Custom tags:', customTags);
    console.log('👥 Staff tags:', staffTags);
}

// Debug current filter state
function debugFilters() {
    console.log('🔧 Current Filter State:');
    console.log('🔍 Search Query:', state.searchQuery);
    console.log('🏢 Building Filter:', state.activeFilters.building);
    console.log('🏢 Floor Filter:', state.activeFilters.floor);
    console.log('🏷️ Tag Filters:', state.activeFilters.tags);
    
    const totalData = state.processedData.length;
    const filteredData = state.currentFilteredData.length;
    
    console.log(`📊 Data: ${filteredData}/${totalData} rooms shown`);
    
    if (filteredData < 20) {
        console.log('📋 Current filtered rooms:');
        console.table(state.currentFilteredData.map(r => ({
            room: r.rmnbr,
            building: r.building,
            floor: r.floor,
            type: r.typeFull
        })));
    }
}

// Test search for common patterns
function testSearchPatterns() {
    const testQueries = [
        'mott',
        'floor 3',
        'building mott',
        'office',
        'exam room',
        '3rd floor',
        'cardiovascular'
    ];
    
    console.log('🧪 Testing search patterns:');
    
    testQueries.forEach(query => {
        const results = searchRoomsByTags(query);
        console.log(`"${query}" → ${results.length} results`);
        
        if (results.length > 0 && results.length < 5) {
            results.forEach(r => {
                console.log(`  📍 ${r.rmnbr} - ${r.building} - ${r.typeFull}`);
            });
        }
    });
}

// Make these functions globally available for debugging
window.debugSearch = debugSearch;
window.debugBuildings = debugBuildings;
window.debugRoomTags = debugRoomTags;
window.debugFilters = debugFilters;
window.testSearchPatterns = testSearchPatterns;
