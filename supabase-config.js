// === SECURE SUPABASE CONFIG - COMPLETE VERSION WITH TROUBLESHOOTER FIXES ===

// ✅ SAFE: Modern publishable key (secure for client-side use)
const SUPABASE_URL = 'https://pzcqsorfobygydxkdmzc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HBT2NPpEPDggpLiEG4RllQ_KDJhp0yp';

let supabaseClient = null;

// Collaboration state
const collaborationState = {
    isOnline: false,
    currentWorkspace: null,
    currentUser: null,
    connectedUsers: new Map(),
    activeChannel: null
};

// ✅ SECURE: Initialize with public key only
async function initializeSupabase() {
    try {
        console.log('🔄 Initializing Supabase...');
        
        // Wait for Supabase library
        let attempts = 0;
        while (attempts < 30) {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                // ✅ Use modern publishable key - this is SAFE for client-side
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
                console.log('✅ Supabase initialized securely with publishable key');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Supabase library not available');
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        return false;
    }
}

// ✅ SECURE: All database operations use RLS-protected client
async function createWorkspace(workspaceName, password, creatorName) {
    if (!supabaseClient) return { success: false, error: 'Supabase not initialized' };
    
    try {
        console.log('🔄 Creating workspace:', workspaceName);
        
        // Create workspace
        const { data: workspace, error } = await supabaseClient
            .from('workspaces')
            .insert({
                name: workspaceName,
                password_hash: btoa(password), // Simple encoding (not secure, but demo-friendly)
                created_by: creatorName,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'Workspace name already exists' };
            }
            throw error;
        }
        
        console.log('✅ Workspace created:', workspaceName);
        return { success: true, workspace };
        
    } catch (error) {
        console.error('❌ Error creating workspace:', error);
        return { success: false, error: error.message };
    }
}

// Join a workspace
async function joinWorkspace(workspaceName, password, userName) {
    if (!supabaseClient) return { success: false, error: 'Supabase not initialized' };
    
    try {
        console.log('🔄 Joining workspace:', workspaceName);
        
        // Find workspace and verify password
        const { data: workspace, error } = await supabaseClient
            .from('workspaces')
            .select('*')
            .eq('name', workspaceName)
            .single();
            
        if (error || !workspace) {
            return { success: false, error: 'Workspace not found' };
        }
        
        // Check password
        if (atob(workspace.password_hash) !== password) {
            return { success: false, error: 'Incorrect password' };
        }
        
        // Set up user and workspace
        collaborationState.currentWorkspace = workspace;
        collaborationState.currentUser = {
            name: userName,
            joinedAt: new Date().toISOString()
        };
        
        // Initialize real-time collaboration
        await initializeRealtimeCollaboration(workspace.id);
        
        console.log('✅ Joined workspace:', workspaceName);
        return { success: true, workspace };
        
    } catch (error) {
        console.error('❌ Error joining workspace:', error);
        return { success: false, error: error.message };
    }
}

// Initialize real-time collaboration for workspace
async function initializeRealtimeCollaboration(workspaceId) {
    try {
        const channelName = `workspace_${workspaceId}`;
        collaborationState.activeChannel = supabaseClient.channel(channelName);
        
        // Subscribe to presence (who's online)
        collaborationState.activeChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = collaborationState.activeChannel.presenceState();
                updateOnlineUsers(presenceState);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('👥 User joined workspace:', newPresences);
                updateOnlineUsers(collaborationState.activeChannel.presenceState());
                showNotification(`${newPresences[0].user_name} joined the workspace`);
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('👋 User left workspace:', leftPresences);
                updateOnlineUsers(collaborationState.activeChannel.presenceState());
                showNotification(`${leftPresences[0].user_name} left the workspace`);
            });
        
        // Subscribe to tag updates
        collaborationState.activeChannel
            .on('broadcast', { event: 'tag_added' }, (payload) => {
                console.log('📥 Tag added:', payload);
                handleRemoteTagUpdate(payload);
            })
            .on('broadcast', { event: 'tag_removed' }, (payload) => {
                console.log('📥 Tag removed:', payload);
                handleRemoteTagRemoval(payload);
            });
        
        // Subscribe to database changes for this workspace
        collaborationState.activeChannel
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'workspace_tags',
                filter: `workspace_id=eq.${workspaceId}`
            }, (payload) => {
                console.log('📊 Database change:', payload);
                syncWorkspaceTags();
            });
        
        await collaborationState.activeChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Track user presence
                await collaborationState.activeChannel.track({
                    user_name: collaborationState.currentUser.name,
                    joined_at: collaborationState.currentUser.joinedAt
                });
                
                collaborationState.isOnline = true;
                
                // Update UI if function exists
                if (typeof updateCollaborationUI === 'function') {
                    updateCollaborationUI();
                } else if (typeof window.updateCollaborationUI === 'function') {
                    window.updateCollaborationUI();
                }
                
                // Load existing workspace tags
                await syncWorkspaceTags();
                
                console.log('✅ Real-time collaboration active');
                showNotification('✅ Connected to workspace!');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Real-time channel error');
                showNotification('❌ Connection error - trying to reconnect...');
            }
        });
        
    } catch (error) {
        console.error('❌ Real-time collaboration error:', error);
    }
}

// Utility function to find room by identifier (FIXED)
function findRoomIdByIdentifier(identifier) {
    let room = state.processedData.find(r => String(r.rmrecnbr) === String(identifier));
    if (!room) room = state.processedData.find(r => r.id.toString() === identifier.toString());
    if (!room) room = state.processedData.find(r => String(r.rmnbr) === String(identifier));
    return room ? room.id : null;
}

// Save tag to workspace (FIXED VERSION)
async function saveTagToWorkspace(roomId, tagObject) {
    console.log('🔍 saveTagToWorkspace called with:', { roomId, tagObject });
    
    if (!supabaseClient) {
        console.error('❌ supabaseClient not initialized');
        return false;
    }
    
    if (!collaborationState.currentWorkspace) {
        console.error('❌ No current workspace');
        return false;
    }
    
    console.log('✅ Basic checks passed');
    
    try {
        // 🎯 FIXED: Handle both string and number IDs
        const room = state.processedData.find(r => r.id.toString() === roomId.toString());
        console.log('🔍 Found room:', room);
        
        if (!room) {
            console.error('❌ Room not found for ID:', roomId);
            console.log('🔍 Available room IDs (first 10):', state.processedData.slice(0, 10).map(r => ({ id: r.id, type: typeof r.id })));
            return false;
        }
        
        const tagData = {
            workspace_id: collaborationState.currentWorkspace.id,
            room_identifier: room.rmrecnbr || room.id,
            tag_name: tagObject.name,
            tag_type: tagObject.type || 'simple',
            tag_data: JSON.stringify(tagObject),
            created_by: collaborationState.currentUser.name,
            created_at: new Date().toISOString()
        };
        
        console.log('🔍 Inserting tag data:', tagData);
        
        const { data, error } = await supabaseClient
            .from('workspace_tags')
            .insert(tagData)
            .select();
            
        if (error) {
            console.error('❌ Database insert error:', error);
            throw error;
        }
        
        console.log('✅ Database insert successful:', data);
        
        // Check if channel exists
        if (!collaborationState.activeChannel) {
            console.error('❌ No active channel for broadcast');
            return false;
        }
        
        console.log('🔍 Broadcasting tag to channel...');
        
        // Broadcast to other users via realtime
        const broadcastResult = await collaborationState.activeChannel.send({
            type: 'broadcast',
            event: 'tag_added',
            payload: {
                room_id: roomId,
                tag: tagObject,
                user: collaborationState.currentUser.name,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('✅ Broadcast result:', broadcastResult);
        console.log('✅ Tag saved to workspace and broadcast:', tagObject.name);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving tag to workspace:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        return false;
    }
}

// Remove tag from workspace (COMPREHENSIVE FIX WITH BOTH TROUBLESHOOTER FIXES)
async function removeTagFromWorkspace(roomId, tagObject) {
    if (!supabaseClient || !collaborationState.currentWorkspace) {
        console.error('❌ Missing supabaseClient or workspace');
        return false;
    }
    
    try {
        console.log('🔄 Starting tag removal process...', {
            roomId,
            tagName: tagObject.name,
            workspace: collaborationState.currentWorkspace.name
        });
        
        // 🎯 FIXED: Use the same type-safe comparison as saveTagToWorkspace
        const room = state.processedData.find(r => r.id.toString() === roomId.toString());
        if (!room) {
            console.error('❌ Room not found for ID:', roomId);
            console.log('🔍 Available room IDs (first 10):', state.processedData.slice(0, 10).map(r => ({ id: r.id, type: typeof r.id })));
            return false;
        }
        
        const roomIdentifier = room.rmrecnbr || room.id;
        
        console.log('🔍 Attempting to delete tag from database:', {
            workspace_id: collaborationState.currentWorkspace.id,
            room_identifier: roomIdentifier,
            tag_name: tagObject.name
        });
        
        // First, let's verify the row exists and is visible
        const { data: existingTags, error: selectError } = await supabaseClient
            .from('workspace_tags')
            .select('*')
            .eq('workspace_id', collaborationState.currentWorkspace.id)
            .eq('room_identifier', roomIdentifier)
            .eq('tag_name', tagObject.name);
            
        if (selectError) {
            console.error('❌ Error checking for existing tag:', selectError);
            throw selectError;
        }
        
        if (!existingTags || existingTags.length === 0) {
            console.warn('⚠️ Tag not found in database - may already be deleted:', {
                workspace_id: collaborationState.currentWorkspace.id,
                room_identifier: roomIdentifier,
                tag_name: tagObject.name
            });
            return true; // Consider it successful if tag doesn't exist
        }
        
        console.log('✅ Found existing tag(s) to delete:', existingTags);
        
        // Now perform the delete operation
        const { data: deletedData, error: deleteError } = await supabaseClient
            .from('workspace_tags')
            .delete()
            .eq('workspace_id', collaborationState.currentWorkspace.id)
            .eq('room_identifier', roomIdentifier)
            .eq('tag_name', tagObject.name)
            .select(); // Add .select() to return deleted rows
            
        if (deleteError) {
            console.error('❌ Database delete error:', deleteError);
            throw deleteError;
        }
        
        console.log('✅ Delete operation result:', deletedData);
        
        if (!deletedData || deletedData.length === 0) {
            console.error('❌ Delete operation returned no rows - this suggests an RLS policy issue');
            console.log('🔍 Check your Supabase RLS policies for the workspace_tags table');
            console.log('🔍 Ensure there is a SELECT policy that allows reading the rows you want to delete');
            return false;
        }
        
        console.log('✅ Successfully deleted from database:', deletedData);
        
        // Broadcast to other users
        if (collaborationState.activeChannel) {
            const broadcastResult = await collaborationState.activeChannel.send({
                type: 'broadcast',
                event: 'tag_removed',
                payload: {
                    room_id: roomId,
                    tag_name: tagObject.name,
                    user: collaborationState.currentUser.name,
                    timestamp: new Date().toISOString()
                }
            });
            console.log('✅ Delete broadcast sent:', broadcastResult);
        }
        
        console.log('✅ Tag removed from workspace successfully:', tagObject.name);
        return true;
        
    } catch (error) {
        console.error('❌ Error removing tag from workspace:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        
        // Check for common RLS-related error codes
        if (error.code === '42501' || error.message?.includes('policy')) {
            console.error('🚨 This looks like a Row Level Security (RLS) policy issue!');
            console.error('🔧 Fix: Check your Supabase RLS policies for workspace_tags table');
        }
        
        return false;
    }
}

// Sync workspace tags to local state
async function syncWorkspaceTags() {
    if (!supabaseClient || !collaborationState.currentWorkspace) return;
    
    try {
        const { data: tags, error } = await supabaseClient
            .from('workspace_tags')
            .select('*')
            .eq('workspace_id', collaborationState.currentWorkspace.id);
            
        if (error) throw error;
        
        // Clear existing workspace tags and rebuild
        Object.keys(state.customTags).forEach(roomId => {
            state.customTags[roomId] = state.customTags[roomId].filter(tag => !tag.workspace);
        });
        
        // Add workspace tags
        tags.forEach(dbTag => {
            const roomId = findRoomIdByIdentifier(dbTag.room_identifier);
            if (roomId) {
                if (!state.customTags[roomId]) state.customTags[roomId] = [];
                
                const tagObject = JSON.parse(dbTag.tag_data);
                tagObject.workspace = true;
                tagObject.created_by = dbTag.created_by;
                
                state.customTags[roomId].push(tagObject);
            }
        });
        
        // Update UI if function exists
        if (typeof updateResults === 'function') {
            updateResults();
        } else if (typeof window.updateResults === 'function') {
            window.updateResults();
        }
        
        console.log(`✅ Synced ${tags.length} workspace tags`);
        
    } catch (error) {
        console.error('❌ Error syncing workspace tags:', error);
    }
}

// 🔧 FIXED: Handle remote tag updates (FIXED PAYLOAD STRUCTURE)
function handleRemoteTagUpdate(payload) {
    if (payload.payload?.user === collaborationState.currentUser?.name) return;
    
    showNotification(`${payload.payload?.user} added tag "${payload.payload?.tag?.name}"`);
    syncWorkspaceTags(); // Refresh tags from server
}

// 🔧 FIXED: Handle remote tag removal (FIXED PAYLOAD STRUCTURE)
function handleRemoteTagRemoval(payload) {
    if (payload.payload?.user === collaborationState.currentUser?.name) return;
    
    showNotification(`${payload.payload?.user} removed tag "${payload.payload?.tag_name}"`);
    syncWorkspaceTags(); // Refresh tags from server
}

// Update online users display
function updateOnlineUsers(presenceState) {
    collaborationState.connectedUsers.clear();
    
    Object.values(presenceState).forEach(presenceList => {
        presenceList.forEach(presence => {
            collaborationState.connectedUsers.set(presence.user_name, presence);
        });
    });
    
    // Update UI if function exists
    if (typeof updateCollaborationUI === 'function') {
        updateCollaborationUI();
    } else if (typeof window.updateCollaborationUI === 'function') {
        window.updateCollaborationUI();
    }
}

// Show notifications
function showNotification(message) {
    // Create a toast notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 right-4 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
            </svg>
            <span class="text-sm">${sanitizeHTML(message)}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Leave workspace
function leaveWorkspace() {
    if (collaborationState.activeChannel) {
        collaborationState.activeChannel.unsubscribe();
    }
    
    // Clear workspace tags from local state
    Object.keys(state.customTags).forEach(roomId => {
        state.customTags[roomId] = state.customTags[roomId].filter(tag => !tag.workspace);
    });
    
    collaborationState.isOnline = false;
    collaborationState.currentWorkspace = null;
    collaborationState.currentUser = null;
    collaborationState.connectedUsers.clear();
    
    // Update UI if function exists
    if (typeof updateCollaborationUI === 'function') {
        updateCollaborationUI();
    } else if (typeof window.updateCollaborationUI === 'function') {
        window.updateCollaborationUI();
    }
    
    if (typeof updateResults === 'function') {
        updateResults();
    } else if (typeof window.updateResults === 'function') {
        window.updateResults();
    }
    
    showNotification('📡 Disconnected from workspace');
}

// Utility function for HTML sanitization (if not available globally)
function sanitizeHTML(text) {
    const temp = document.createElement('div');
    temp.textContent = text || '';
    return temp.innerHTML;
}

// Export functions (FIXED WITH BOTH TROUBLESHOOTER FIXES)
window.workspaceCollaboration = {
    initializeSupabase,
    createWorkspace,
    joinWorkspace,
    saveTagToWorkspace,
    removeTagFromWorkspace,
    syncWorkspaceTags,
    leaveWorkspace,
    collaborationState,
    get supabaseClient() { return supabaseClient; }  // 🎯 FIX 1: Expose supabaseClient for debugging
};
