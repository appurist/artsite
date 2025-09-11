import { Client, TablesDB, Storage, Account, Query, Avatars, Functions } from 'appwrite';

const APPWRITE_ENDPOINT = "https://nyc.cloud.appwrite.io/v1"
const APPWRITE_PROJECT_ID = "artsite"
const APPWRITE_DATABASE_ID = "68bfaf22002f08bd470a"

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Initialize services
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
export const account = new Account(client);
export const avatars = new Avatars(client);
export const functions = new Functions(client);

// Configuration constants
export const DATABASE_ID = APPWRITE_DATABASE_ID;
export const ARTWORKS_TABLE_ID = 'artworks';
export const SETTINGS_TABLE_ID = 'settings';
export const DOMAINS_TABLE_ID = 'domains';
export const PROFILES_TABLE_ID = 'profiles';
export const STORAGE_BUCKET_ID = 'images';

// Helper functions  
export const hasActiveSession = async () => {
    try {
        const user = await account.get();
        return user !== null;
    } catch (error) {
        // Only return false for authentication errors, rethrow other errors
        if (error.code === 401 && error.type === 'general_unauthorized_scope') {
            return false; // Not logged in - this is expected
        }
        // Rethrow other errors (network issues, etc.)
        console.error('Unexpected error checking session:', error);
        return false;
    }
};

export const getCurrentUser = async () => {
    try {
        const user = await account.get();
        return user;
    } catch (error) {
        // Only return null for authentication errors, rethrow other errors
        if (error.code === 401 && error.type === 'general_unauthorized_scope') {
            return null; // Not logged in - this is expected
        }
        // Log other errors but still return null to avoid breaking the app
        console.error('Unexpected error getting user:', error);
        return null;
    }
};

export const getUserAvatarInitials = (name, width = 24, height = 24, background = '667eea') => {
    try {
        // Use Appwrite's avatar initials service with our primary color
        return avatars.getInitials(name, width, height, background);
    } catch (error) {
        console.error('Error getting avatar initials:', error);
        return null;
    }
};

export const register = async (email, password, name) => {
    return await account.create('unique()', email, password, name);
};

export const login = async (email, password) => {
    return await account.createEmailPasswordSession(email, password);
};

export const logout = async () => {
    return await account.deleteSession('current');
};

// Database helpers
export const getArtworks = async (userId = null) => {
    try {
        const queries = [];

        // If userId is provided and not '*', filter by that user
        // If userId is '*', show all artworks (no filter)
        if (userId && userId !== '*') {
            // Use Query.equal syntax for Appwrite
            queries.push(Query.equal('user_id', userId));
        }

        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: ARTWORKS_TABLE_ID,
            queries: queries
        });
        return response.rows;
    } catch (error) {
        console.error('Error fetching artworks:', error);
        return [];
    }
};

export const getArtwork = async (id) => {
    try {
        return await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: ARTWORKS_TABLE_ID,
            rowId: id
        });
    } catch (error) {
        console.error('Error fetching artwork:', error);
        return null;
    }
};

// Secure database operations - uses server-side validation
export const secureOperation = async (mode, table, data, docId = null) => {
    try {
        const payload = { mode, table, data };
        if (docId) payload.docId = docId;
        
        const result = await functions.createExecution(
            'secure-create',
            JSON.stringify(payload)
        );
        
        // Check if function execution failed
        if (result.responseStatusCode < 200 || result.responseStatusCode >= 300) {
            const error = JSON.parse(result.responseBody).error;
            throw new Error(error || `Failed to ${mode} document`);
        }
        
        // Parse the function's response
        const functionResponse = JSON.parse(result.responseBody);
        
        // Check if the function itself returned an error (even with 201 execution status)
        if (functionResponse.error) {
            throw new Error(functionResponse.error);
        }
        
        return functionResponse;
    } catch (error) {
        console.error(`Error in secure ${mode}:`, error);
        throw error;
    }
};

export const secureCreate = async (table, data) => {
    return await secureOperation('create', table, data);
};

export const secureUpdate = async (table, docId, data) => {
    return await secureOperation('update', table, data, docId);
};

export const createArtwork = async (data) => {
    try {
        // Use secure server-side create function
        return await secureCreate(ARTWORKS_TABLE_ID, data);
    } catch (error) {
        console.error('Error creating artwork:', error);
        throw error;
    }
};

export const updateArtwork = async (id, data) => {
    try {
        // Use secure server-side update function
        return await secureUpdate(ARTWORKS_TABLE_ID, id, data);
    } catch (error) {
        console.error('Error updating artwork:', error);
        throw error;
    }
};

export const deleteArtwork = async (id) => {
    try {
        return await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: ARTWORKS_TABLE_ID,
            rowId: id
        });
    } catch (error) {
        console.error('Error deleting artwork:', error);
        throw error;
    }
};

// Settings helpers
export const getSettings = async (userId) => {
    try {
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: SETTINGS_TABLE_ID,
            queries: [Query.equal('user_id', userId)]
        });
        
        if (response.rows.length > 0) {
            return JSON.parse(response.rows[0].settings);
        }
        
        // Return default settings if none exist
        return {
            'site.title': 'Art Gallery',
            'site.subtitle': 'Original paintings and artwork', 
            'site.description': 'A collection of original artwork and paintings.',
            'theme.primaryColor': '#667eea',
            'theme.secondaryColor': '#764ba2',
            'artist.name': '',
            'artist.bio': '',
            'artist.statement': '',
            'artist.email': '',
            'artist.phone': '',
            'artist.website': '',
            'pages.about.enabled': 'true',
            'pages.about.title': 'About the Artist',
            'pages.about.content': '',
            'pages.contact.enabled': 'true',
            'pages.contact.title': 'Contact',
            'pages.contact.content': '',
            'pages.blog.enabled': 'false',
            'pages.blog.title': 'Blog'
        };
    } catch (error) {
        console.error('Error fetching settings:', error);
        return {};
    }
};

export const getSetting = async (userId, key) => {
    try {
        const settings = await getSettings(userId);
        return settings[key] || null;
    } catch (error) {
        console.error('Error fetching setting:', error);
        return null;
    }
};

export const updateSettings = async (userId, settingsObj) => {
    try {
        // Check if user settings already exist
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: SETTINGS_TABLE_ID,
            queries: [Query.equal('user_id', userId)]
        });

        if (response.rows.length > 0) {
            // Update existing settings
            return await secureUpdate(SETTINGS_TABLE_ID, response.rows[0].$id, {
                settings: JSON.stringify(settingsObj)
            });
        } else {
            // Create new settings record
            return await secureCreate(SETTINGS_TABLE_ID, {
                user_id: userId,
                settings: JSON.stringify(settingsObj)
            });
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};

export const setSetting = async (userId, key, value) => {
    try {
        // Get current settings
        const currentSettings = await getSettings(userId);
        
        // Update the specific setting
        currentSettings[key] = value;
        
        // Save back the entire settings object
        return await updateSettings(userId, currentSettings);
    } catch (error) {
        console.error('Error setting value:', error);
        throw error;
    }
};

// Domain helpers
export const getDomainConfig = async (hostname) => {
    try {
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: DOMAINS_TABLE_ID,
            queries: [Query.equal('hostname', hostname)]
        });
        return response.rows[0] || null;
    } catch (error) {
        console.error('Error fetching domain config:', error);
        return null;
    }
};

export const getDefaultFocusUser = async () => {
    try {
        const hostname = window.location.hostname;
        const domainConfig = await getDomainConfig(hostname);
        
        // Return the focus_user from domain config, or '*' as default
        return domainConfig?.focus_user || '*';
    } catch (error) {
        console.error('Error getting default focus user:', error);
        return '*';
    }
};

// Profile helpers
export const getProfile = async (userId) => {
    try {
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PROFILES_TABLE_ID,
            queries: [Query.equal('user_id', userId)]
        });
        return response.rows[0] || null;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
};

export const getProfiles = async (userIds) => {
    try {
        if (!userIds || userIds.length === 0) return [];
        
        // For multiple user IDs, we need to fetch all profiles and filter client-side
        // or make individual queries. Let's fetch all public profiles for now.
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PROFILES_TABLE_ID
        });
        
        // Filter to only the requested user IDs
        return response.rows.filter(profile => userIds.includes(profile.user_id));
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
};

export const getPublicProfiles = async () => {
    try {
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PROFILES_TABLE_ID,
            queries: [Query.equal('is_public', true)]
        });
        return response.rows;
    } catch (error) {
        console.error('Error fetching public profiles:', error);
        return [];
    }
};

export const getArtistProfiles = async () => {
    try {
        // Since we might not have boolean fields yet, let's just get all profiles for now
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: PROFILES_TABLE_ID
        });
        return response.rows;
    } catch (error) {
        console.error('Error fetching artist profiles:', error);
        return [];
    }
};

export const createProfile = async (data) => {
    try {
        // Use secure server-side create function
        return await secureCreate(PROFILES_TABLE_ID, data);
    } catch (error) {
        console.error('Error creating profile:', error);
        throw error;
    }
};

export const updateProfile = async (id, data) => {
    try {
        // Use secure server-side update function
        return await secureUpdate(PROFILES_TABLE_ID, id, data);
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

export const getOrCreateProfile = async (userId, displayName) => {
    try {
        let profile = await getProfile(userId);
        
        if (!profile) {
            // Create basic profile with display name
            profile = await createProfile({
                user_id: userId,
                display_name: displayName,
                is_public: true,
                show_in_directory: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        
        return profile;
    } catch (error) {
        console.error('Error getting or creating profile:', error);
        throw error;
    }
};

// Storage helpers
export const uploadFile = async (file) => {
    try {
        return await storage.createFile(STORAGE_BUCKET_ID, 'unique()', file);
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export const getFileView = (fileId) => {
    return storage.getFileView(STORAGE_BUCKET_ID, fileId);
};

export const getFilePreview = (fileId, width = 400, height = 400) => {
    // Free plan doesn't support transformations, use raw file view instead
    return storage.getFileView(STORAGE_BUCKET_ID, fileId);
};

export const deleteFile = async (fileId) => {
    try {
        return await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};
