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
    
    // Create a comprehensive duplicate detection system
    const existingRoomsMap = new Map();
    const existingRoomsByComposite = new Map();
    
    state.processedData.forEach(room => {
        // Primary key: rmrecnbr
        if (room.rmrecnbr) {
            existingRoomsMap.set(room.rmrecnbr.toString(), room);
        }
        // Secondary key: composite of room number, floor, and building
        const compositeKey = `${room.rmnbr}_${room.floor}_${(room.bld_descrshort || room.building || 'unknown').toLowerCase()}`;
        existingRoomsByComposite.set(compositeKey, room);
    });
    
    // Track processed rooms in this batch (hidden from user)
    const processedInBatch = new Set();
    let hiddenDuplicatesSkipped = 0;
    let hiddenRoomsUpdated = 0;

    data.forEach((row) => {
        if (!row.rmnbr || typeof row.floor === 'undefined' || row.floor === null) {
             console.warn('Skipping row due to missing rmnbr or floor:', row);
             return;
        }

        // Multi-level duplicate detection (hidden feature)
        let roomKey = null;
        let existingRoom = null;
        
        // Level 1: Check by rmrecnbr (most reliable)
        if (row.rmrecnbr) {
            roomKey = row.rmrecnbr.toString();
            existingRoom = existingRoomsMap.get(roomKey);
        }
        
        // Level 2: Check by composite key if no rmrecnbr match
        if (!existingRoom) {
            const building = (row.bld_descrshort || row.building || 'unknown').toLowerCase();
            roomKey = `${row.rmnbr}_${row.floor}_${building}`;
            existingRoom = existingRoomsByComposite.get(roomKey);
        }
        
        // Level 3: Check within current batch
        if (processedInBatch.has(roomKey)) {
            hiddenDuplicatesSkipped++;
            return; // Silently skip duplicate
        }
        
        // FIXED: Consistent building handling
        const building = (row.bld_descrshort || row.building || 'Unknown Building').trim();
        buildings.add(building);

        const type = normalizeAbbreviation(row.rmtyp_descrshort, unmapped);
        const sub = normalizeAbbreviation(row.rmsubtyp_descrshort, unmapped);
        const normalizedDept = normalizeAbbreviation(row.dept_descr, unmapped);

        let full = type;
        if (sub && type !== sub) {
            full = `${type} - ${sub}`;
        }
        if (fullReplacements[`${type} ${sub}`.trim()]) {
            full = fullReplacements[`${type} ${sub}`.trim()];
        } else if (type === sub) {
            full = type;
        }

        const rowTags = generateTags(full, normalizedDept);
        rowTags.forEach(t => tags.add(t));
        floors.add(row.floor.toString());

        const processedRoom = {
            ...row,
            id: uniqueIdCounter++,
            typeFull: full,
            dept_descr: normalizedDept,
            tags: rowTags,
            mgisLink: generateMgisLink(row),
            building: building,
            bld_descrshort: row.bld_descrshort || building
        };

        // Handle existing room update or new room addition
        if (existingRoom) {
            // Silently update existing room with new data
            const existingIndex = state.processedData.findIndex(r => r.id === existingRoom.id);
            if (existingIndex !== -1) {
                // Preserve the original ID and any custom/staff tags
                processedRoom.id = existingRoom.id;
                state.processedData[existingIndex] = processedRoom;
                hiddenRoomsUpdated++;
            }
        } else {
            // Add new room
            processed.push(processedRoom);
        }
        
        processedInBatch.add(roomKey);
    });

    // Update building colors
    const buildingsArray = Array.from(buildings);
    buildingsArray.forEach((b, index) => {
        if (!state.buildingColors[b]) {
            state.buildingColors[b] = assignBuildingColor(b, Object.keys(state.buildingColors).length);
        }
    });

    // Only add new rooms (not duplicates)
    state.processedData = state.processedData.concat(processed);
    state.unmappedAbbreviations = { ...state.unmappedAbbreviations, ...unmapped };

    state.availableBuildings = [...new Set([...state.availableBuildings, ...buildingsArray])].sort();
    state.availableFloors = [...new Set([...state.availableFloors, ...Array.from(floors)])].sort((a, b) => Number(a) - Number(b));
    state.availableTags = [...new Set([...state.availableTags, ...Array.from(tags)])].sort();
    state.currentPage = 1;

    // Hidden feature: Log deduplication silently (dev console only, no user notification)
    if (hiddenDuplicatesSkipped > 0 || hiddenRoomsUpdated > 0) {
        console.log(`🔒 Hidden deduplication: ${hiddenDuplicatesSkipped} duplicates prevented, ${hiddenRoomsUpdated} rooms updated, ${processed.length} new rooms added`);
    }

    updateLoadingStatus('Creating search index...');
    await createSearchIndex();
}

// 🔒 HIDDEN FEATURE: Post-processing duplicate cleanup
function cleanupExistingDuplicates() {
    if (state.processedData.length === 0) return;
    
    const uniqueRooms = new Map();
    const duplicatesFound = [];
    let cleanedCount = 0;
    
    // Build a map of unique rooms using multiple identification strategies
    state.processedData.forEach((room, index) => {
        let uniqueKey = null;
        
        // Strategy 1: Use rmrecnbr if available (most reliable)
        if (room.rmrecnbr) {
            uniqueKey = `rec_${room.rmrecnbr}`;
        }
        // Strategy 2: Use composite key of room number + floor + building
        else {
            const building = (room.bld_descrshort || room.building || 'unknown').toLowerCase().trim();
            uniqueKey = `comp_${room.rmnbr}_${room.floor}_${building}`;
        }
        
        if (uniqueRooms.has(uniqueKey)) {
            // Found duplicate - keep the first one, mark this for removal
            duplicatesFound.push(index);
            cleanedCount++;
        } else {
            uniqueRooms.set(uniqueKey, room);
        }
    });
    
    // Remove duplicates by filtering out the marked indices
    if (duplicatesFound.length > 0) {
        // Create new array without duplicates, preserving custom/staff tags for kept rooms
        const cleanedData = state.processedData.filter((room, index) => {
            const shouldKeep = !duplicatesFound.includes(index);
            
            // If we're removing this room, transfer its tags to the kept duplicate
            if (!shouldKeep) {
                const building = (room.bld_descrshort || room.building || 'unknown').toLowerCase().trim();
                const uniqueKey = room.rmrecnbr ? `rec_${room.rmrecnbr}` : `comp_${room.rmnbr}_${room.floor}_${building}`;
                const keptRoom = Array.from(uniqueRooms.values()).find(r => {
                    const keptKey = r.rmrecnbr ? `rec_${r.rmrecnbr}` : `comp_${r.rmnbr}_${r.floor}_${(r.bld_descrshort || r.building || 'unknown').toLowerCase().trim()}`;
                    return keptKey === uniqueKey;
                });
                
                if (keptRoom) {
                    // Transfer custom tags
                    const removedCustomTags = state.customTags[room.id] || [];
                    const keptCustomTags = state.customTags[keptRoom.id] || [];
                    if (removedCustomTags.length > 0) {
                        state.customTags[keptRoom.id] = [...keptCustomTags, ...removedCustomTags];
                        delete state.customTags[room.id];
                    }
                    
                    // Transfer staff tags
                    const removedStaffTags = state.staffTags[room.id] || [];
                    const keptStaffTags = state.staffTags[keptRoom.id] || [];
                    if (removedStaffTags.length > 0) {
                        // Merge and deduplicate staff tags
                        state.staffTags[keptRoom.id] = [...new Set([...keptStaffTags, ...removedStaffTags])];
                        delete state.staffTags[room.id];
                    }
                }
            }
            
            return shouldKeep;
        });
        
        state.processedData = cleanedData;
        
        // Reassign sequential IDs to prevent gaps
        state.processedData.forEach((room, index) => {
            const oldId = room.id;
            room.id = index;
            
            // Update tag references if ID changed
            if (oldId !== index) {
                if (state.customTags[oldId]) {
                    state.customTags[index] = state.customTags[oldId];
                    delete state.customTags[oldId];
                }
                if (state.staffTags[oldId]) {
                    state.staffTags[index] = state.staffTags[oldId];
                    delete state.staffTags[oldId];
                }
            }
        });
        
        console.log(`🔒 Hidden cleanup: Removed ${cleanedCount} duplicate rooms, preserved all tags`);
    }
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

    // 🔒 HIDDEN FEATURE: Clean up any remaining duplicates after all processing
    if (state.processedData.length > 0) {
        cleanupExistingDuplicates();
        // Re-create search index after cleanup
        await createSearchIndex();
    }

    updateFilesListUI(); // Direct call to ui.js function
    updateDataSummary(); // Direct call to ui.js function
    await updateUI();      // Direct call to ui.js function

    if(state.processedData.length > 0) {
        enableDependentFeatures(); // Direct call to ui.js function
        updateUploadAreaState(); // Direct call to ui.js function
        
        // 🔧 ROBUST: Ensure search inputs are enabled after cleanup (multiple approaches)
        setTimeout(() => {
            // Method 1: Direct element access
            const searchInput = document.getElementById('search-input');
            const searchInputMobile = document.getElementById('search-input-mobile');
            
            if (searchInput) {
                searchInput.disabled = false;
                searchInput.placeholder = "Search rooms, types, staff... Try 'Building: [name]'";
            }
            if (searchInputMobile) {
                searchInputMobile.disabled = false;
                searchInputMobile.placeholder = "Search rooms, types, staff...";
            }
            
            // Method 2: Through elements object
            if (elements.searchInput) {
                elements.searchInput.disabled = false;
            }
            if (elements.searchInputMobile) {
                elements.searchInputMobile.disabled = false;
            }
            
            console.log('🔧 Search inputs re-enabled after cleanup');
        }, 100); // Small delay to ensure DOM is ready
    }

    if (state.processedData.length > 0 || Object.keys(state.customTags).length > 0) {
        showSecurityReminder(); // Direct call to app.js function (made global)
    }

    showLoading(false);
    setProcessingState(false, elements.processingIndicator);
}

// Make handleFiles globally accessible (this fixes the "handleFiles is not defined" error)
window.handleFiles = handleFiles;
