// ==================== FILE PARSING FUNCTIONS ====================

async function parseFile(file) {
    const fileType = file.name.split('.').pop().toLowerCase();
    updateLoadingStatus(`Parsing ${file.name}

// ==================== ENHANCED UNIFIED SEARCH ARCHITECTURE ====================

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

// Enhanced search that uses structured query processing
function searchRoomsByTags(searchQuery) {
    if (!searchQuery || !state.processedData.length) {
        return [...state.processedData];
    }
    
    // Score and rank results
    const scoredResults = state.processedData.map(room => {
        const roomTags = createUnifiedTags(room);
        let score = 0;
        const queryLower = searchQuery.toLowerCase();
        
        // Simple but effective scoring
        roomTags.forEach(tag => {
            if (tag.includes(queryLower)) {
                if (tag === queryLower) {
                    score += 10; // Exact match
                } else if (tag.startsWith(queryLower)) {
                    score += 5; // Starts with query
                } else {
                    score += 2; // Contains query
                }
            }
        });
        
        // Boost score for exact room number matches
        if (room.rmnbr && room.rmnbr.toString().toLowerCase() === queryLower) {
            score += 20;
        }
        
        return { room, score };
    });
    
    // Filter and sort results
    return scoredResults
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.room);
}

// Simplified filter function that properly combines search and dropdown filters
function data_getFilteredData() {
    // Start with search results or all data if no search query
    let result = searchRoomsByTags(state.searchQuery);
    
    // Apply dropdown filters AFTER search
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
    
    // Apply tag filters properly
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

// Enhanced autocomplete that suggests all types of tags
function buildAutocompleteList() {
    const suggestions = new Set();
    const limit = 1000;
    
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
    const results = searchRoomsByTags(query);
    console.log(`📊 Found ${results.length} results`);
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

// Make functions globally accessible 
window.handleFiles = handleFiles;
window.exportCustomTags = exportCustomTags;
window.importCustomTags = importCustomTags;
window.exportSession = exportSession;
window.importSession = importSession;
window.data_getFilteredData = data_getFilteredData;
window.createSearchIndex = createSearchIndex;
window.updateAutocomplete = updateAutocomplete;
window.hideAutocomplete = hideAutocomplete;
window.handleAutocompleteKeydown = handleAutocompleteKeydown;
window.normalizeAbbreviation = normalizeAbbreviation;
window.generateTags = generateTags;
window.debugSearch = debugSearch;
window.debugBuildings = debugBuildings;
window.debugRoomTags = debugRoomTags;
window.debugFilters = debugFilters;...`);
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
    }

    if (state.processedData.length > 0 || Object.keys(state.customTags).length > 0) {
        showSecurityReminder(); // Direct call to app.js function (made global)
    }

    showLoading(false);
    setProcessingState(false, elements.processingIndicator);
    
    // 🔧 FINAL FIX: Force-enable search inputs after everything is completely done
    setTimeout(() => {
        console.log('🔧 Final search input check...');
        
        // Check current state
        const searchInput = document.getElementById('search-input');
        const searchInputMobile = document.getElementById('search-input-mobile');
        
        console.log('Search input disabled?', searchInput ? searchInput.disabled : 'not found');
        console.log('Search input mobile disabled?', searchInputMobile ? searchInputMobile.disabled : 'not found');
        
        // Force enable multiple ways
        if (searchInput) {
            searchInput.disabled = false;
            searchInput.removeAttribute('disabled');
            console.log('✅ Desktop search input force-enabled');
        }
        if (searchInputMobile) {
            searchInputMobile.disabled = false;
            searchInputMobile.removeAttribute('disabled');
            console.log('✅ Mobile search input force-enabled');
        }
        
        // Also through elements object
        if (window.elements && window.elements.searchInput) {
            window.elements.searchInput.disabled = false;
            window.elements.searchInput.removeAttribute('disabled');
        }
        if (window.elements && window.elements.searchInputMobile) {
            window.elements.searchInputMobile.disabled = false;
            window.elements.searchInputMobile.removeAttribute('disabled');
        }
        
        console.log('🔧 Search inputs should now be enabled');
    }, 500); // Longer delay to run after everything else
}
}

// Make handleFiles globally accessible (this fixes the "handleFiles is not defined" error)
window.handleFiles = handleFiles;

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
