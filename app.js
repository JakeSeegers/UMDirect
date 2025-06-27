// --- MAIN APP LOGIC, EVENT LISTENERS, MODAL HANDLING ---

let currentRoomIdForModal = null;

// --- MODAL FUNCTIONS ---
function showWelcomeModal() {
    if (!elements.welcomeModal || (elements.dontShowAgain && localStorage.getItem('hideWelcomeModal') === 'true')) {
        return;
    }
    elements.welcomeModal.classList.remove('hidden');
}
function hideWelcomeModal() {
    if (!elements.welcomeModal) return;
    elements.welcomeModal.classList.add('hidden');
    if (elements.dontShowAgain && elements.dontShowAgain.checked) {
        localStorage.setItem('hideWelcomeModal', 'true');
    }
}

function showSecurityReminder() {
    if (state.hideSecurityReminder || !elements.securityReminderModal) return;
    elements.securityReminderModal.classList.remove('hidden');
}
window.showSecurityReminder = showSecurityReminder; // Make global for data.js

function hideSecurityReminder() {
    if (!elements.securityReminderModal) return;
    elements.securityReminderModal.classList.add('hidden');
    if (elements.dontShowSecurityAgain && elements.dontShowSecurityAgain.checked) {
        state.hideSecurityReminder = true;
    }
}

function showMgisComplianceModal() {
    if (!elements.mgisComplianceModal) return;
    elements.mgisComplianceModal.classList.remove('hidden');
    elements.mgisComplianceCheckbox.checked = false;
    elements.mgisExportConfirmBtn.disabled = true;
}
function hideMgisComplianceModal() {
    if (elements.mgisComplianceModal) {
        elements.mgisComplianceModal.classList.add('hidden');
    }
}

// --- WORKSPACE COLLABORATION MODAL FUNCTIONS ---
function handleCollaborationButtonClick() {
    // 🔧 FIX: Check if workspaceCollaboration exists first
    if (!window.workspaceCollaboration) {
        console.error('❌ Workspace collaboration not loaded yet');
        alert('Workspace system is still loading. Please wait a moment and try again.');
        return;
    }
    
    // 🔧 FIX: Check if collaborationState exists
    if (!window.workspaceCollaboration.collaborationState) {
        console.error('❌ Collaboration state not initialized');
        alert('Workspace system not ready. Please refresh the page.');
        return;
    }
    
    // Now safely check if online
    if (window.workspaceCollaboration.collaborationState.isOnline) {
        // Already connected, offer to leave workspace
        const workspaceName = window.workspaceCollaboration.collaborationState.currentWorkspace?.name;
        if (confirm(`Leave workspace "${workspaceName}"?`)) {
            window.workspaceCollaboration.leaveWorkspace();
        }
    } else {
        // Not connected, show workspace selection
        showWorkspaceSelectionModal();
    }
}

function showWorkspaceSelectionModal() {
    const modal = document.getElementById('workspace-selection-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideWorkspaceSelectionModal() {
    const modal = document.getElementById('workspace-selection-modal');
    if (modal) modal.classList.add('hidden');
}

function showCreateWorkspaceModal() {
    hideWorkspaceSelectionModal();
    const modal = document.getElementById('create-workspace-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const nameInput = document.getElementById('new-workspace-name');
        if (nameInput) nameInput.focus();
    }
}

function hideCreateWorkspaceModal() {
    const modal = document.getElementById('create-workspace-modal');
    if (modal) modal.classList.add('hidden');
    clearCreateWorkspaceForm();
}

function showJoinWorkspaceModal() {
    hideWorkspaceSelectionModal();
    const modal = document.getElementById('join-workspace-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const nameInput = document.getElementById('join-workspace-name');
        if (nameInput) nameInput.focus();
    }
}

function hideJoinWorkspaceModal() {
    const modal = document.getElementById('join-workspace-modal');
    if (modal) modal.classList.add('hidden');
    clearJoinWorkspaceForm();
}

function clearCreateWorkspaceForm() {
    const fields = ['new-workspace-name', 'new-workspace-password', 'workspace-creator-name'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

function clearJoinWorkspaceForm() {
    const fields = ['join-workspace-name', 'join-workspace-password', 'join-user-name'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

async function createWorkspace() {
    const nameField = document.getElementById('new-workspace-name');
    const passwordField = document.getElementById('new-workspace-password');
    const creatorField = document.getElementById('workspace-creator-name');
    
    const workspaceName = nameField?.value?.trim();
    const password = passwordField?.value?.trim();
    const creatorName = creatorField?.value?.trim();
    
    if (!workspaceName || !password || !creatorName) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (workspaceName.length < 3) {
        alert('Workspace name must be at least 3 characters');
        return;
    }
    
    if (password.length < 4) {
        alert('Password must be at least 4 characters');
        return;
    }
    
    try {
        showLoading(true);
        
        const result = await window.workspaceCollaboration.createWorkspace(workspaceName, password, creatorName);
        
        if (result.success) {
            hideCreateWorkspaceModal();
            showCollaborationNotification(`✅ Workspace "${workspaceName}" created! You're now connected.`);
            
            // Automatically join the created workspace
            const joinResult = await window.workspaceCollaboration.joinWorkspace(workspaceName, password, creatorName);
            if (joinResult.success) {
                updateCollaborationUI();
            }
        } else {
            alert('Failed to create workspace: ' + result.error);
        }
    } catch (error) {
        console.error('Create workspace error:', error);
        alert('Error creating workspace: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function joinWorkspace() {
    const nameField = document.getElementById('join-workspace-name');
    const passwordField = document.getElementById('join-workspace-password');
    const userField = document.getElementById('join-user-name');
    
    const workspaceName = nameField?.value?.trim();
    const password = passwordField?.value?.trim();
    const userName = userField?.value?.trim();
    
    if (!workspaceName || !password || !userName) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        showLoading(true);
        
        const result = await window.workspaceCollaboration.joinWorkspace(workspaceName, password, userName);
        
        if (result.success) {
            hideJoinWorkspaceModal();
            showCollaborationNotification(`✅ Joined workspace "${workspaceName}"!`);
            updateCollaborationUI();
        } else {
            alert('Failed to join workspace: ' + result.error);
        }
    } catch (error) {
        console.error('Join workspace error:', error);
        alert('Error joining workspace: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 🔧 FIXED: Better workspace connection checking
function updateWorkspaceTaggingOption() {
    const workspaceOption = document.getElementById('workspace-sharing-option');
    const workspaceNameDisplay = document.getElementById('workspace-name-display');
    
    // 🔧 IMPROVED: More robust connection checking
    const isConnected = !!(
        window.workspaceCollaboration &&
        window.workspaceCollaboration.collaborationState &&
        window.workspaceCollaboration.collaborationState.isOnline &&
        window.workspaceCollaboration.collaborationState.currentWorkspace &&
        window.workspaceCollaboration.collaborationState.currentUser
    );
    
    if (isConnected) {
        const workspaceName = window.workspaceCollaboration.collaborationState.currentWorkspace.name;
        if (workspaceOption && workspaceNameDisplay) {
            workspaceNameDisplay.textContent = workspaceName || 'Unknown';
            workspaceOption.style.display = 'block';
        }
        console.log(`✅ Workspace sharing option shown for: ${workspaceName}`);
    } else {
        if (workspaceOption) {
            workspaceOption.style.display = 'none';
        }
        console.log('⚠️ Workspace sharing option hidden - not connected');
    }
}

// 🔧 IMPROVED: Better collaboration UI updates
function updateCollaborationUI() {
    const collabButton = elements.collaborationBtn;
    const collabStatus = elements.collaborationStatus;
    
    // 🔧 BETTER: More robust state checking
    const isOnline = !!(
        window.workspaceCollaboration?.collaborationState?.isOnline &&
        window.workspaceCollaboration?.collaborationState?.currentWorkspace &&
        window.workspaceCollaboration?.collaborationState?.currentUser
    );
    
    if (isOnline) {
        const workspaceName = window.workspaceCollaboration.collaborationState.currentWorkspace?.name;
        const currentUser = window.workspaceCollaboration.collaborationState.currentUser?.name;
        const workspaceCreator = window.workspaceCollaboration.collaborationState.currentWorkspace?.created_by;
        const isAdmin = currentUser === workspaceCreator;
        
        if (collabButton) {
            collabButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                ${isAdmin ? '👑 ' : ''}Connected: ${workspaceName}
            `;
            collabButton.classList.remove('um-button-blue');
            collabButton.classList.add('um-button-maize');
            collabButton.title = isAdmin ? 'You are the workspace admin' : 'Connected to workspace';
        }
        
        if (collabStatus) {
            collabStatus.classList.remove('hidden');
            
            // 🔧 NEW: Show admin status in collaboration status
            const adminBadge = isAdmin ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">👑 Admin</span>' : '';
            
            // Update the collaboration status content
            const statusContent = collabStatus.querySelector('.flex-grow');
            if (statusContent) {
                statusContent.innerHTML = `
                    <h4 class="font-medium text-green-800 mb-2 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
                        </svg>
                        Team Collaboration Active${adminBadge}
                    </h4>
                    <p class="text-green-700 text-sm mb-2">Your custom tags are shared with your team in real-time.</p>
                    ${isAdmin ? '<p class="text-yellow-700 text-sm mb-2"><strong>Admin privileges:</strong> You can delete any team member\'s tags.</p>' : ''}
                `;
            }
        }
    } else {
        if (collabButton) {
            collabButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                Join Workspace
            `;
            collabButton.classList.remove('um-button-maize');
            collabButton.classList.add('um-button-blue');
            collabButton.title = 'Join a workspace to collaborate';
        }
        
        if (collabStatus) {
            collabStatus.classList.add('hidden');
        }
    }
    
    // 🔧 NEW: Update workspace tagging option visibility
    updateWorkspaceTaggingOption();
}

// 🔧 ENHANCED: Better notification with user context
function showCollaborationNotification(message) {
    // Create a toast notification with better styling
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 right-4 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in max-w-sm';
    notification.innerHTML = `
        <div class="flex items-start gap-2">
            <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
            </svg>
            <span class="text-sm">${sanitizeHTML(message)}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds with fade animation
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function displayTagInfo(tag) {
    if (!elements.tagInfoModal || !elements.tagInfoTitle || !elements.tagInfoContent) return;
    if (!tag || !(tag.isRich || tag.description || tag.link || tag.imageUrl || tag.contact)) return;

    elements.tagInfoTitle.textContent = sanitizeHTML(tag.name);
    let content = '';
    if (tag.imageUrl) content += `<div class="mb-4"><img src="${sanitizeHTML(tag.imageUrl)}" class="tag-image max-w-full rounded-lg border" alt="Tag image for ${sanitizeHTML(tag.name)}" /></div>`;
    if (tag.description) content += `<div class="mb-4"><h4 class="font-medium text-um-blue mb-1">Description</h4><p class="text-gray-600">${sanitizeHTML(tag.description)}</p></div>`;
    if (tag.contact) content += `<div class="mb-4"><h4 class="font-medium text-um-blue mb-1">Contact</h4><p class="text-gray-600">${sanitizeHTML(tag.contact)}</p></div>`;
    if (tag.link) content += `<div class="mb-4"><h4 class="font-medium text-um-blue mb-1">Related Link</h4><a href="${sanitizeHTML(tag.link)}" target="_blank" rel="noopener noreferrer" class="text-um-blue hover:underline">${sanitizeHTML(tag.link)}</a></div>`;
    
    // Add workspace info if available
    if (tag.workspace && tag.created_by) {
        content += `<div class="mb-4 p-3 bg-blue-50 rounded-lg"><h4 class="font-medium text-blue-700 mb-1">Workspace Info</h4><p class="text-blue-600 text-sm">Created by: ${sanitizeHTML(tag.created_by)}</p></div>`;
    }
    
    content += `<div class="text-xs text-gray-500 mt-4 border-t pt-2"><p>Type: ${sanitizeHTML(tag.type)}</p><p class="flex items-center">Color: <span class="inline-block w-4 h-4 rounded-full ml-2 tag-${sanitizeHTML(tag.color)} border"></span> <span class="ml-1">${sanitizeHTML(tag.color)}</span></p><p>Created: ${new Date(tag.created).toLocaleString()}</p></div>`;
    elements.tagInfoContent.innerHTML = content;
    elements.tagInfoModal.classList.remove('hidden');
}
window.displayTagInfo = displayTagInfo; // Make global for ui.js

// 🎯 UPDATED: Handle add tag click with workspace option
function handleAddTagClick(roomId) {
    const room = state.processedData.find(r => r.id.toString() === roomId.toString()) || state.currentFilteredData.find(r => r.id.toString() === roomId.toString());
    if (!room || !elements.customTagModal || !elements.modalRoomInfo) return;
    
    currentRoomIdForModal = roomId;
    state.previouslyFocusedElement = document.activeElement;
    elements.modalRoomInfo.textContent = `Room: ${room.rmnbr} - ${room.typeFull} (${room.building || room.bld_descrshort || 'Unknown Building'})`;
    
    updateCustomTagsModalDisplay();
    clearTagForm();
    updateWorkspaceTaggingOption(); // 🎯 NEW: Update workspace sharing option
    elements.customTagModal.classList.remove('hidden');
    if(elements.tagNameInput) elements.tagNameInput.focus();
}

function closeTagModal() {
    if (elements.customTagModal) elements.customTagModal.classList.add('hidden');
    if (state.previouslyFocusedElement) state.previouslyFocusedElement.focus();
    currentRoomIdForModal = null;
}

function updateCustomTagsModalDisplay() {
    if (!elements.customTagsListModal || !currentRoomIdForModal) return;
    elements.customTagsListModal.innerHTML = '';
    const customTagsForRoom = state.customTags[currentRoomIdForModal] || [];
    const staffTagsForRoom = state.staffTags[currentRoomIdForModal] || [];

    if (staffTagsForRoom.length > 0) {
        elements.customTagsListModal.insertAdjacentHTML('beforeend', '<h4 class="text-sm font-medium text-gray-600 mb-1">Staff:</h4>');
        staffTagsForRoom.forEach(staffTagString => elements.customTagsListModal.appendChild(createTagElementInModal(staffTagString, 'staff', false)));
    }
    if (customTagsForRoom.length > 0) {
        elements.customTagsListModal.insertAdjacentHTML('beforeend', `<h4 class="text-sm font-medium text-gray-600 ${staffTagsForRoom.length > 0 ? 'mt-3' : ''} mb-1">Custom Tags:</h4>`);
        customTagsForRoom.forEach(richTagObj => elements.customTagsListModal.appendChild(createTagElementInModal(richTagObj, 'custom', true)));
    }
    if (staffTagsForRoom.length === 0 && customTagsForRoom.length === 0) elements.customTagsListModal.innerHTML = '<p class="text-sm text-gray-500">No custom tags or staff assigned.</p>';
}

function createTagElementInModal(tagData, type, removable) {
    const template = elements.customTagItemTemplate.content.cloneNode(true);
    const span = template.querySelector('span');
    const tagNameEl = span.querySelector('[data-content="tag-name"]');
    const removeBtn = span.querySelector('[data-action="remove-custom-tag"]');
    let name, color, isRichTagObject = false;

    if (type === 'staff') { 
        name = tagData.startsWith('Staff: ') ? tagData.substring(7) : tagData; 
        color = 'gray'; 
    } else { 
        name = tagData.name; 
        color = tagData.color || 'blue'; 
        isRichTagObject = true; 
    }

    tagNameEl.textContent = name;
    span.classList.add(`tag-${color}`);
    
    // Add workspace indicator for workspace tags
    if (tagData.workspace) {
        const workspaceIndicator = document.createElement('div');
        workspaceIndicator.className = 'absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white';
        workspaceIndicator.title = `Workspace tag by ${tagData.created_by || 'team member'}`;
        span.style.position = 'relative';
        span.appendChild(workspaceIndicator);
    }
    
    // Only show rich tag indicator if there's actual rich content (not just color/type changes)
    if (isRichTagObject && (tagData.description || tagData.link || tagData.imageUrl || tagData.contact)) {
        span.classList.add('rich-tag'); span.style.cursor = 'pointer';
        span.onclick = () => displayTagInfo(tagData); // Direct call
    }
    if (!removable || !removeBtn) removeBtn?.remove();
    else {
        removeBtn.dataset.tagId = tagData.id;
        if (['maize', 'yellow', 'orange', 'lightblue'].includes(color)) removeBtn.classList.add('text-um-text-on-maize', 'hover:text-red-700');
        else removeBtn.classList.add('text-gray-300', 'hover:text-white');
    }
    return span;
}

// 🔧 FIXED: Enhanced addRichTagFromModal with better error handling
async function addRichTagFromModal() {
    if (!currentRoomIdForModal) return;
    const name = elements.tagNameInput?.value?.trim() || '';
    if (!name) { alert('Please enter a tag name.'); return; }

    const type = elements.tagTypeSelect?.value || 'simple';
    const description = elements.tagDescriptionInput?.value?.trim() || '';
    const link = elements.tagLinkInput?.value?.trim() || '';
    const contact = elements.tagContactInput?.value?.trim() || '';
    const imageUrl = elements.tagImageInput?.value?.trim() || '';
    const selectedColorEl = document.querySelector('#custom-tag-modal .color-option.selected');
    const color = selectedColorEl ? selectedColorEl.dataset.color : 'blue';
    
    // 🔧 IMPROVED: Better workspace connection check with fresh state
    const shareToWorkspace = document.getElementById('share-to-workspace-checkbox')?.checked || false;
    
    const newRichTag = createRichTag(name, type, description, link, contact, imageUrl, color);

    if (!state.customTags[currentRoomIdForModal]) state.customTags[currentRoomIdForModal] = [];
    if (state.customTags[currentRoomIdForModal].some(tag => tag.name.toLowerCase() === newRichTag.name.toLowerCase())) {
        alert(`A tag with the name "${newRichTag.name}" already exists for this room.`); return;
    }
    
    // Add to local state first
    state.customTags[currentRoomIdForModal].push(newRichTag);
    
    // 🔧 IMPROVED: Better workspace sharing logic with comprehensive checks
    if (shareToWorkspace) {
        console.log('🔄 Attempting to share tag to workspace...', newRichTag);
        
        // 🔧 COMPREHENSIVE: Check all required workspace components
        const workspaceReady = !!(
            window.workspaceCollaboration &&
            typeof window.workspaceCollaboration.saveTagToWorkspace === 'function' &&
            window.workspaceCollaboration.collaborationState &&
            window.workspaceCollaboration.collaborationState.isOnline &&
            window.workspaceCollaboration.collaborationState.currentWorkspace &&
            window.workspaceCollaboration.collaborationState.currentUser &&
            window.workspaceCollaboration.supabaseClient
        );
        
        console.log('🔍 Workspace readiness check:', {
            workspaceCollaboration: !!window.workspaceCollaboration,
            saveFunction: !!(window.workspaceCollaboration?.saveTagToWorkspace),
            collaborationState: !!(window.workspaceCollaboration?.collaborationState),
            isOnline: window.workspaceCollaboration?.collaborationState?.isOnline,
            currentWorkspace: !!(window.workspaceCollaboration?.collaborationState?.currentWorkspace),
            currentUser: !!(window.workspaceCollaboration?.collaborationState?.currentUser),
            supabaseClient: !!(window.workspaceCollaboration?.supabaseClient),
            overall: workspaceReady
        });
        
        if (workspaceReady) {
            try {
                console.log('🔄 Calling saveTagToWorkspace...');
                const success = await window.workspaceCollaboration.saveTagToWorkspace(currentRoomIdForModal, newRichTag);
                console.log('🔍 saveTagToWorkspace returned:', success, typeof success);
                
                if (success === true) {
                    // Mark as workspace tag
                    newRichTag.workspace = true;
                    newRichTag.created_by = window.workspaceCollaboration.collaborationState.currentUser.name;
                    console.log('✅ Tag shared to workspace successfully');
                    
                    const workspaceName = window.workspaceCollaboration.collaborationState.currentWorkspace.name;
                    showCollaborationNotification(`✅ Tag "${newRichTag.name}" shared with "${workspaceName}"`);
                } else {
                    console.error('❌ Failed to share tag to workspace - function returned:', success);
                    
                    // 🔧 BETTER: More specific error handling
                    if (success === false) {
                        // Check if it's a duplicate error by looking for existing tag
                        const existingTag = state.customTags[currentRoomIdForModal]?.find(tag => 
                            tag.name === newRichTag.name && tag.workspace
                        );
                        
                        if (existingTag) {
                            alert(`A workspace tag named "${newRichTag.name}" already exists for this room. Please choose a different name.`);
                            // Remove the local tag we just added since it conflicts
                            state.customTags[currentRoomIdForModal] = state.customTags[currentRoomIdForModal].filter(tag => tag.id !== newRichTag.id);
                            clearTagForm();
                            updateCustomTagsModalDisplay();
                            return; // Don't continue with the process
                        } else {
                            alert('Failed to share tag to workspace. Tag saved locally only.');
                        }
                    } else {
                        alert('Failed to share tag to workspace. Tag saved locally only.');
                    }
                }
            } catch (error) {
                console.error('❌ Error sharing tag to workspace:', error);
                console.error('❌ Error details:', error.message, error.stack);
                
                // 🔧 BETTER: Handle specific error types
                if (error.message && error.message.includes('duplicate key')) {
                    alert(`A workspace tag named "${newRichTag.name}" already exists for this room. Please choose a different name.`);
                    // Remove the local tag since it conflicts
                    state.customTags[currentRoomIdForModal] = state.customTags[currentRoomIdForModal].filter(tag => tag.id !== newRichTag.id);
                    clearTagForm();
                    updateCustomTagsModalDisplay();
                    return;
                } else {
                    alert('Error sharing tag to workspace: ' + error.message + '\nTag saved locally only.');
                }
            }
        } else {
            console.warn('⚠️ Workspace not ready for sharing');
            console.log('🔍 Missing components:', {
                workspaceCollaboration: !window.workspaceCollaboration,
                saveFunction: !window.workspaceCollaboration?.saveTagToWorkspace,
                collaborationState: !window.workspaceCollaboration?.collaborationState,
                isOnline: !window.workspaceCollaboration?.collaborationState?.isOnline,
                currentWorkspace: !window.workspaceCollaboration?.collaborationState?.currentWorkspace,
                currentUser: !window.workspaceCollaboration?.collaborationState?.currentUser,
                supabaseClient: !window.workspaceCollaboration?.supabaseClient
            });
            
            alert('Not properly connected to workspace. Tag saved locally only.\n\nPlease ensure you\'re connected to a workspace and try again.');
        }
    } else {
        console.log('🔍 Workspace sharing skipped - checkbox not checked');
    }
    
    clearTagForm();
    updateCustomTagsModalDisplay();
}

function clearTagForm() {
    if (elements.tagNameInput) elements.tagNameInput.value = '';
    if (elements.tagDescriptionInput) elements.tagDescriptionInput.value = '';
    if (elements.tagLinkInput) elements.tagLinkInput.value = '';
    if (elements.tagContactInput) elements.tagContactInput.value = '';
    if (elements.tagImageInput) elements.tagImageInput.value = '';
    if (elements.tagTypeSelect) elements.tagTypeSelect.value = 'simple';
    document.querySelectorAll('#custom-tag-modal .color-option').forEach(opt => opt.classList.remove('selected'));
    const defaultColorOption = document.querySelector('#custom-tag-modal .color-option[data-color="blue"]');
    if (defaultColorOption) defaultColorOption.classList.add('selected');
    if (elements.imagePreviewContainer) elements.imagePreviewContainer.classList.add('hidden');
    if (elements.imagePreview) elements.imagePreview.src = '';
}

async function saveCustomTagsFromModal() {
    closeTagModal();
    state.currentPage = 1;
    await createSearchIndex(); // Direct call to data.js function
    await updateResults();       // Direct call to ui.js function
}

// 🔧 FIXED: Enhanced removeCustomTag with admin system support
async function removeCustomTag(tagId, roomId) {
    if (!roomId || !tagId) {
        console.error('❌ removeCustomTag: Missing roomId or tagId');
        return;
    }
    
    const roomTags = state.customTags[roomId];
    if (!roomTags) {
        console.error('❌ removeCustomTag: No tags found for room', roomId);
        return;
    }
    
    const tagIndex = roomTags.findIndex(tag => tag.id.toString() === tagId.toString());
    if (tagIndex === -1) {
        console.error('❌ removeCustomTag: Tag not found', tagId);
        return;
    }
    
    const tagToRemove = roomTags[tagIndex];
    console.log(`🗑️ removeCustomTag: Removing "${tagToRemove.name}" (workspace: ${!!tagToRemove.workspace})`);
    
    // 🔧 IMPROVED: Handle workspace tags with admin system
    if (tagToRemove.workspace) {
        // Check if workspace collaboration is available
        const workspaceReady = !!(
            window.workspaceCollaboration &&
            window.workspaceCollaboration.collaborationState &&
            window.workspaceCollaboration.collaborationState.isOnline &&
            typeof window.workspaceCollaboration.removeTagFromWorkspace === 'function'
        );
        
        if (workspaceReady) {
            console.log('🔄 Attempting workspace tag deletion...');
            
            try {
                const success = await window.workspaceCollaboration.removeTagFromWorkspace(roomId, tagToRemove);
                
                if (success) {
                    console.log('✅ Workspace tag deleted successfully');
                    
                    // 🔧 BETTER: Show admin action notification
                    const currentUser = window.workspaceCollaboration.collaborationState.currentUser?.name;
                    const workspaceCreator = window.workspaceCollaboration.collaborationState.currentWorkspace?.created_by;
                    const isAdmin = currentUser === workspaceCreator;
                    const isCreator = tagToRemove.created_by === currentUser;
                    
                    if (isAdmin && !isCreator) {
                        showCollaborationNotification(`👑 Admin deleted "${tagToRemove.name}" created by ${tagToRemove.created_by}`);
                    } else {
                        showCollaborationNotification(`🗑️ Deleted "${tagToRemove.name}"`);
                    }
                    
                    // Remove from local state (workspace deletion should have handled this, but ensure it's gone)
                    roomTags.splice(tagIndex, 1);
                } else {
                    console.error('❌ Workspace tag deletion failed');
                    // Don't remove from local state if workspace deletion failed
                    return;
                }
            } catch (error) {
                console.error('❌ Error deleting workspace tag:', error);
                
                // 🔧 BETTER: Handle permission errors gracefully
                if (error.message && error.message.includes('Permission denied')) {
                    // The error was already shown to user via alert in removeTagFromWorkspace
                    return; // Don't remove from local state
                } else {
                    alert('Error deleting workspace tag: ' + error.message);
                    return; // Don't remove from local state
                }
            }
        } else {
            console.warn('⚠️ Workspace not available - removing tag locally only');
            alert('Warning: Not connected to workspace. Tag will be removed locally but may reappear when you reconnect.');
            
            // Remove from local state only
            roomTags.splice(tagIndex, 1);
        }
    } else {
        // Local tag - remove directly
        console.log('🗑️ Removing local tag');
        roomTags.splice(tagIndex, 1);
    }
    
    // Update the modal display
    updateCustomTagsModalDisplay();
    
    // Update the main UI if needed
    if (typeof updateResults === 'function') {
        updateResults();
    }
}

function goToPage(pageNumber) {
    const totalItems = state.currentFilteredData.length;
    if (state.resultsPerPage === 0 && pageNumber !== 1) return;
    const totalPages = (state.resultsPerPage === 0) ? 1 : Math.ceil(totalItems / state.resultsPerPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        state.currentPage = pageNumber;
        updateResults(); // Direct call to ui.js function
    }
}

function setupEventListeners() {
    if (elements.selectDesktopViewBtn) elements.selectDesktopViewBtn.addEventListener('click', () => setViewMode('desktop', true)); // Direct call
    if (elements.selectMobileViewBtn) elements.selectMobileViewBtn.addEventListener('click', () => setViewMode('mobile', true));   // Direct call
    if (elements.viewSwitchBtn) elements.viewSwitchBtn.addEventListener('click', () => setViewMode(state.currentViewMode === 'desktop' ? 'mobile' : 'desktop')); // Direct call

    if (elements.uploadHeader) elements.uploadHeader.addEventListener('click', toggleUploadSection); // Direct call

    // NEW Workspace collaboration event listeners
    if (elements.collaborationBtn) {
        elements.collaborationBtn.addEventListener('click', handleCollaborationButtonClick);
    }
    
    // Workspace selection modal
    if (document.getElementById('close-workspace-selection-btn')) {
        document.getElementById('close-workspace-selection-btn').addEventListener('click', hideWorkspaceSelectionModal);
    }
    if (document.getElementById('create-workspace-btn')) {
        document.getElementById('create-workspace-btn').addEventListener('click', showCreateWorkspaceModal);
    }
    if (document.getElementById('join-workspace-btn')) {
        document.getElementById('join-workspace-btn').addEventListener('click', showJoinWorkspaceModal);
    }
    
    // Create workspace modal
    if (document.getElementById('close-create-workspace-btn')) {
        document.getElementById('close-create-workspace-btn').addEventListener('click', hideCreateWorkspaceModal);
    }
    if (document.getElementById('create-workspace-cancel-btn')) {
        document.getElementById('create-workspace-cancel-btn').addEventListener('click', hideCreateWorkspaceModal);
    }
    if (document.getElementById('create-workspace-confirm-btn')) {
        document.getElementById('create-workspace-confirm-btn').addEventListener('click', createWorkspace);
    }
    
    // Join workspace modal
    if (document.getElementById('close-join-workspace-btn')) {
        document.getElementById('close-join-workspace-btn').addEventListener('click', hideJoinWorkspaceModal);
    }
    if (document.getElementById('join-workspace-cancel-btn')) {
        document.getElementById('join-workspace-cancel-btn').addEventListener('click', hideJoinWorkspaceModal);
    }
    if (document.getElementById('join-workspace-confirm-btn')) {
        document.getElementById('join-workspace-confirm-btn').addEventListener('click', joinWorkspace);
    }
    
    // Modal click-outside handlers
    const workspaceSelectionModal = document.getElementById('workspace-selection-modal');
    if (workspaceSelectionModal) {
        workspaceSelectionModal.addEventListener('click', (e) => {
            if (e.target === workspaceSelectionModal) hideWorkspaceSelectionModal();
        });
    }
    
    const createWorkspaceModal = document.getElementById('create-workspace-modal');
    if (createWorkspaceModal) {
        createWorkspaceModal.addEventListener('click', (e) => {
            if (e.target === createWorkspaceModal) hideCreateWorkspaceModal();
        });
    }
    
    const joinWorkspaceModal = document.getElementById('join-workspace-modal');
    if (joinWorkspaceModal) {
        joinWorkspaceModal.addEventListener('click', (e) => {
            if (e.target === joinWorkspaceModal) hideJoinWorkspaceModal();
        });
    }

    const uploadArea = elements.universalUploadArea;
    const uploadInput = elements.universalUploadInput;
    if (uploadArea && uploadInput) {
        uploadArea.addEventListener('click', (e) => { if (e.target === uploadArea || e.target.closest('#upload-content-normal') || e.target.closest('#upload-content-empty')) uploadInput.click(); });
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.remove('dragover'); });
        uploadArea.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); }); // Direct call
        uploadInput.addEventListener('change', (e) => handleFiles(e.target.files)); // Direct call
    }

    if (elements.exportTagsBtn) elements.exportTagsBtn.addEventListener('click', (e) => { e.stopPropagation(); exportCustomTags(); }); // Direct call
    if (elements.exportSessionBtn) elements.exportSessionBtn.addEventListener('click', (e) => { e.stopPropagation(); showMgisComplianceModal(); });

    if (elements.closeMgisModal) elements.closeMgisModal.addEventListener('click', hideMgisComplianceModal);
    if (elements.mgisComplianceModal) elements.mgisComplianceModal.addEventListener('click', (e) => { if (e.target === elements.mgisComplianceModal) hideMgisComplianceModal(); });
    if (elements.mgisComplianceCheckbox) elements.mgisComplianceCheckbox.addEventListener('change', (e) => { elements.mgisExportConfirmBtn.disabled = !e.target.checked; });
    if (elements.mgisCancelBtn) elements.mgisCancelBtn.addEventListener('click', hideMgisComplianceModal);
    if (elements.mgisExportConfirmBtn) elements.mgisExportConfirmBtn.addEventListener('click', () => { hideMgisComplianceModal(); exportSession(); }); // Direct call

    const debouncedSearch = debounce(() => { state.currentPage = 1; updateResults(); }, 350); // Direct call

    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            if (elements.searchInputMobile) elements.searchInputMobile.value = state.searchQuery;
            updateAutocomplete(state.searchQuery); // Direct call
            debouncedSearch();
        });
        elements.searchInput.addEventListener('keydown', handleAutocompleteKeydown); // Direct call
        elements.searchInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 150)); // Direct call
    }
    if (elements.searchForm) elements.searchForm.addEventListener('submit', (e) => e.preventDefault());
    if (elements.searchInputMobile) {
        elements.searchInputMobile.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            if (elements.searchInput) elements.searchInput.value = state.searchQuery;
            debouncedSearch();
        });
    }
    if (elements.autocompleteContainer) {
        elements.autocompleteContainer.addEventListener('mousedown', (e) => {
            const item = e.target.closest('[role="option"]');
            if (item) {
                e.preventDefault();
                const selectedValue = item.dataset.item;
                elements.searchInput.value = selectedValue;
                if (elements.searchInputMobile) elements.searchInputMobile.value = selectedValue;
                state.searchQuery = selectedValue;
                hideAutocomplete(); // Direct call
                state.currentPage = 1;
                updateResults(); // Direct call
            }
        });
    }

    ['building', 'floor'].forEach(filterType => {
        const desktopEl = elements[`${filterType}Filter`];
        const mobileEl = elements[`${filterType}FilterMobile`];
        if (desktopEl) desktopEl.addEventListener('change', (e) => { state.activeFilters[filterType] = e.target.value; if (mobileEl) mobileEl.value = e.target.value; state.currentPage = 1; updateResults(); }); // Direct call
        if (mobileEl) mobileEl.addEventListener('change', (e) => { state.activeFilters[filterType] = e.target.value; if (desktopEl) desktopEl.value = e.target.value; state.currentPage = 1; updateResults(); }); // Direct call
    });

    [elements.tagFilter, elements.tagFilterMobile].forEach(el => {
        if (el) el.addEventListener('change', (e) => {
            const selectedTag = e.target.value;
            if (selectedTag && !state.activeFilters.tags.includes(selectedTag)) { state.activeFilters.tags.push(selectedTag); state.currentPage = 1; updateResults(); } // Direct call
            e.target.value = '';
            if (elements.tagFilter) elements.tagFilter.value = '';
            if (elements.tagFilterMobile) elements.tagFilterMobile.value = '';
        });
    });

    if (elements.activeTagsContainer) elements.activeTagsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove-tag"]');
        if (btn) { state.activeFilters.tags = state.activeFilters.tags.filter(t => t !== btn.dataset.tag); state.currentPage = 1; updateResults(); } // Direct call
    });
    if (elements.clearTagsBtn) elements.clearTagsBtn.addEventListener('click', () => { state.activeFilters.tags = []; state.currentPage = 1; updateResults(); }); // Direct call

    [elements.resultsPerPage, elements.resultsPerPageMobile].forEach(el => {
        if (el) el.addEventListener('change', (e) => {
            state.resultsPerPage = parseInt(e.target.value, 10);
            if (elements.resultsPerPage) elements.resultsPerPage.value = e.target.value;
            if (elements.resultsPerPageMobile) elements.resultsPerPageMobile.value = e.target.value;
            state.currentPage = 1; updateResults(); // Direct call
        });
    });

    if (elements.prevPageBtn) elements.prevPageBtn.addEventListener('click', () => goToPage(state.currentPage - 1));
    if (elements.nextPageBtn) elements.nextPageBtn.addEventListener('click', () => goToPage(state.currentPage + 1));

    if (elements.closeSecurityModal) elements.closeSecurityModal.addEventListener('click', hideSecurityReminder);
    if (elements.securityOkBtn) elements.securityOkBtn.addEventListener('click', hideSecurityReminder);
    if (elements.closeWelcomeBtn) elements.closeWelcomeBtn.addEventListener('click', hideWelcomeModal);
    if (elements.welcomeOkBtn) elements.welcomeOkBtn.addEventListener('click', hideWelcomeModal);
    if (elements.closeTagInfoBtn) elements.closeTagInfoBtn.addEventListener('click', () => { if (elements.tagInfoModal) elements.tagInfoModal.classList.add('hidden'); });
    if (elements.tagInfoModal) elements.tagInfoModal.addEventListener('click', (e) => { if (e.target === elements.tagInfoModal) elements.tagInfoModal.classList.add('hidden'); });
    if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeTagModal);
    if (elements.addRichTagBtn) elements.addRichTagBtn.addEventListener('click', addRichTagFromModal);
    if (elements.saveTagsBtn) elements.saveTagsBtn.addEventListener('click', saveCustomTagsFromModal);
    if (elements.customTagModal) elements.customTagModal.addEventListener('click', (e) => { if (e.target === elements.customTagModal) closeTagModal(); });
    if (elements.customTagsListModal) elements.customTagsListModal.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="remove-custom-tag"]');
        if (btn && currentRoomIdForModal) { 
            await removeCustomTag(btn.dataset.tagId, currentRoomIdForModal);
        }
    });
    if (elements.tagNameInput) elements.tagNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addRichTagFromModal(); }});

    function delegateAddTag(event) {
        const button = event.target.closest('[data-action="add-tag"]');
        if (button) { const roomId = button.dataset.id; if (roomId) handleAddTagClick(roomId); }
    }
    if (elements.resultsBody) elements.resultsBody.addEventListener('click', delegateAddTag);
    if (elements.mobileResults) elements.mobileResults.addEventListener('click', delegateAddTag);

    const colorPicker = document.querySelector('#custom-tag-modal .color-picker');
    if (colorPicker) colorPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) { colorPicker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected')); e.target.classList.add('selected'); }
    });
    if (elements.tagImageInput && elements.imagePreview && elements.imagePreviewContainer) {
        elements.tagImageInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) { elements.imagePreview.src = url; elements.imagePreview.onload = () => elements.imagePreviewContainer.classList.remove('hidden'); elements.imagePreview.onerror = () => elements.imagePreviewContainer.classList.add('hidden'); }
            else elements.imagePreviewContainer.classList.add('hidden');
        });
    }
}

// 🔧 IMPROVED: Initialize workspace collaboration with better error handling
async function initializeWorkspaceCollaboration() {
    try {
        if (window.workspaceCollaboration) {
            console.log('🔄 Initializing workspace collaboration...');
            const initialized = await window.workspaceCollaboration.initializeSupabase();
            
            if (initialized) {
                console.log('✅ Workspace collaboration system ready');
                
                // 🔧 NEW: Set up periodic connection health checks
                setInterval(() => {
                    const isOnline = window.workspaceCollaboration?.collaborationState?.isOnline;
                    const hasWorkspace = window.workspaceCollaboration?.collaborationState?.currentWorkspace;
                    
                    if (isOnline && hasWorkspace) {
                        // Periodically update UI to ensure consistency
                        updateCollaborationUI();
                    }
                }, 30000); // Check every 30 seconds
                
            } else {
                console.error('❌ Failed to initialize workspace collaboration');
            }
        } else {
            console.warn('⚠️ Workspace collaboration not available');
        }
    } catch (error) {
        console.error('❌ Error initializing workspace collaboration:', error);
    }
}

// 🔧 IMPROVED: Better cleanup on page unload
function setupWorkspaceCleanup() {
    // Enhanced cleanup that handles various scenarios
    const cleanup = () => {
        try {
            if (window.workspaceCollaboration?.collaborationState?.isOnline) {
                console.log('🧹 Cleaning up workspace connection...');
                window.workspaceCollaboration.leaveWorkspace();
            }
        } catch (error) {
            console.error('❌ Error during workspace cleanup:', error);
        }
    };
    
    // Handle multiple cleanup scenarios
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('unload', cleanup);
    
    // Handle visibility change (tab switching, minimizing)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Re-check workspace connection when tab becomes visible
            setTimeout(() => {
                if (window.workspaceCollaboration?.collaborationState?.isOnline) {
                    updateCollaborationUI();
                }
            }, 1000);
        }
    });
}

// 🔧 NEW: Utility function to check workspace health
function checkWorkspaceHealth() {
    const health = {
        workspaceCollaboration: !!window.workspaceCollaboration,
        collaborationState: !!window.workspaceCollaboration?.collaborationState,
        isOnline: window.workspaceCollaboration?.collaborationState?.isOnline,
        currentWorkspace: !!window.workspaceCollaboration?.collaborationState?.currentWorkspace,
        currentUser: !!window.workspaceCollaboration?.collaborationState?.currentUser,
        supabaseClient: !!window.workspaceCollaboration?.supabaseClient,
        activeChannel: !!window.workspaceCollaboration?.collaborationState?.activeChannel
    };
    
    const allHealthy = Object.values(health).every(Boolean);
    
    console.log('🔍 Workspace Health Check:', health);
    console.log(`Overall Health: ${allHealthy ? '✅ Healthy' : '❌ Issues detected'}`);
    
    return { health, allHealthy };
}

// Make utility functions globally available for debugging
window.checkWorkspaceHealth = checkWorkspaceHealth;
window.updateWorkspaceTaggingOption = updateWorkspaceTaggingOption;

document.addEventListener('DOMContentLoaded', () => {
    const elementIds = [
      'upload-header', 'upload-content-section', 'chevron-icon', 'universal-upload-area', 'universal-upload-input',
      'upload-content-normal', 'upload-content-empty',
      'processing-indicator', 'uploaded-files-list', 'data-summary', 'summary-content', 'errors-container', 'errors-list',
      'search-form', 'search-input', 'search-input-mobile', 'autocomplete-container',
      'building-filter', 'building-filter-mobile', 'floor-filter', 'floor-filter-mobile',
      'tag-filter', 'tag-filter-mobile', 'results-per-page', 'results-per-page-mobile',
      'active-tags-container', 'clear-tags-btn',
      'results-table', 'results-body',
      'mobile-results', 'empty-state', 'results-footer', 'results-count',
      'export-tags-btn', 'export-session-btn', 'collaboration-btn',
      'collaboration-status', 'online-users',
      'mgis-compliance-modal', 'close-mgis-modal', 'mgis-compliance-checkbox', 'mgis-cancel-btn', 'mgis-export-confirm-btn',
      'security-reminder-modal', 'close-security-modal', 'security-ok-btn', 'dont-show-security-again',
      'welcome-modal', 'close-welcome-btn', 'welcome-ok-btn', 'dont-show-again',
      'tag-info-modal', 'close-tag-info-btn', 'tag-info-title', 'tag-info-content',
      'custom-tag-modal', 'close-modal-btn', 'modal-room-info', 'tag-name-input', 'tag-type-select',
      'tag-description-input', 'tag-link-input', 'tag-contact-input', 'tag-image-input', 'image-preview-container', 'image-preview',
      'add-rich-tag-btn', 'custom-tags-list-modal', 'save-tags-btn',
      'loading-overlay', 'row-template', 'mobile-card-template', 'tag-span-template', 'autocomplete-item-template',
      'active-tag-template', 'custom-tag-item-template',
      'pagination-controls', 'prev-page-btn', 'page-info', 'next-page-btn',
      'view-selection-modal', 'select-desktop-view-btn', 'select-mobile-view-btn',
      'view-switch-btn', 'view-switch-icon-MOBILE-ICON', 'view-switch-icon-DESKTOP-ICON',
      'desktop-search-section', 'mobile-search-section'
    ];
    elementIds.forEach(id => {
        const camelCaseId = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        elements[camelCaseId] = document.getElementById(id);
    });
    elements.viewSwitchIconMobilePhone = document.getElementById('view-switch-icon-MOBILE-ICON');
    elements.viewSwitchIconDesktopMonitor = document.getElementById('view-switch-icon-DESKTOP-ICON');

    console.log('🏥 Hospital Room Directory - UMich Version with Workspace Collaboration Initialized');
    if (localStorage.getItem('hideWelcomeModal') === 'true') state.hideWelcomeModal = true;
    if (elements.resultsPerPage) elements.resultsPerPage.value = state.resultsPerPage.toString();
    if (elements.resultsPerPageMobile) elements.resultsPerPageMobile.value = state.resultsPerPage.toString();

    setupEventListeners();
    initializeAppView(); // Direct call to ui.js function
    showWelcomeModal();
    updatePaginationControls(0); // Direct call to ui.js function
    updateDataSummary();        // Direct call to ui.js function
    updateUploadAreaState();    // Direct call to ui.js function
    
    // Initialize workspace collaboration with better error handling
    initializeWorkspaceCollaboration();
    
    // 🔧 NEW: Set up workspace cleanup
    setupWorkspaceCleanup();
});
