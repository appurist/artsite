import { Client, TablesDB, Storage, Account } from 'appwrite';

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

// Configuration constants
export const DATABASE_ID = APPWRITE_DATABASE_ID;
export const ARTWORKS_TABLE_ID = 'artworks';
export const SETTINGS_TABLE_ID = 'settings';
export const STORAGE_BUCKET_ID = 'images';

// Helper functions
export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch (error) {
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
export const getArtworks = async (userFilter = false) => {
    try {
        const queries = [];

        // If userFilter is requested, only get current user's artworks
        if (userFilter) {
            const user = await getCurrentUser();
            if (user) {
                const userId = user.$id;
                queries.push('equal("user_id", "' + userId + '")');
            } else {
                // No user authenticated, return empty array for user-filtered requests
                return [];
            }
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

export const createArtwork = async (data) => {
    try {
        return await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: ARTWORKS_TABLE_ID,
            rowId: 'unique()',
            data: data
        });
    } catch (error) {
        console.error('Error creating artwork:', error);
        throw error;
    }
};

export const updateArtwork = async (id, data) => {
    try {
        return await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: ARTWORKS_TABLE_ID,
            rowId: id,
            data: data
        });
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
            queries: [`equal("key", "${key}")`]
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
            queries: [`equal("key", "${key}")`]
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
            // Create new
            return await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: SETTINGS_TABLE_ID,
                rowId: 'unique()',
                data: { key, value }
            });
        }
    } catch (error) {
        console.error('Error setting value:', error);
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
