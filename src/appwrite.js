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
export const STORAGE_BUCKET_ID = 'images';

// Helper functions
export const hasActiveSession = async () => {
    try {
        await account.getSession('current');
        return true;
    } catch (error) {
        return false;
    }
};

export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch (error) {
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
        
        if (result.responseStatusCode !== 200) {
            const error = JSON.parse(result.responseBody).error;
            throw new Error(error || `Failed to ${mode} document`);
        }
        
        return JSON.parse(result.responseBody);
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
export const getSettings = async () => {
    try {
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: SETTINGS_TABLE_ID
        });
        const settings = {};
        response.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        return settings;
    } catch (error) {
        console.error('Error fetching settings:', error);
        return {};
    }
};

export const getSetting = async (key) => {
    try {
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: SETTINGS_TABLE_ID,
            queries: [Query.equal('key', key)]
        });
        return response.rows[0]?.value || null;
    } catch (error) {
        console.error('Error fetching setting:', error);
        return null;
    }
};

export const setSetting = async (key, value) => {
    try {
        // Try to find existing setting
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: SETTINGS_TABLE_ID,
            queries: [Query.equal('key', key)]
        });

        if (response.rows.length > 0) {
            // Update existing
            return await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: SETTINGS_TABLE_ID,
                rowId: response.rows[0].$id,
                data: { value }
            });
        } else {
            // Create new using secure function
            return await secureCreate(SETTINGS_TABLE_ID, { key, value });
        }
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
