const { Client, Databases, Account, Permission, Role } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
    try {
        // 1) Validate caller using JWT (more secure than user-id header)
        const userJwt = req.headers['x-appwrite-user-jwt'];
        if (!userJwt) {
            return res.json({ error: 'Authentication required' }, 401);
        }

        // User-scoped client for trusted validation
        const userClient = new Client()
            .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
            .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
            .setJWT(userJwt);

        const user = await new Account(userClient).get(); // Trusted user verification
        const userId = user.$id;

        // 2) Server client with API key for database operations
        const serverClient = new Client()
            .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
            .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
            .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

        const databases = new Databases(serverClient);
        const DATABASE_ID = '68bfaf22002f08bd470a';

        // Parse request data - handle both direct JSON and wrapped body
        let requestData;
        if (req.bodyJson.body) {
            // Body is wrapped in a "body" field (from createExecution)
            requestData = JSON.parse(req.bodyJson.body);
        } else {
            // Direct JSON body
            requestData = req.bodyJson;
        }
        
        const { mode, table, data, docId } = requestData;
        if (!table || !data) {
            return res.json({ error: 'Table and data required' }, 400);
        }

        if (mode === 'create') {
            try {
                // Server-side security: always set owner to authenticated user
                let secureData = {
                    ...data,
                    user_id: userId        // Force user_id to authenticated user
                };
                
                // Only add created_by and created_at for tables that support them
                if (table !== 'settings') {
                    secureData.created_by = userId;
                    secureData.created_at = new Date().toISOString();
                }

                log(`Creating ${table} document for user ${userId}`);
                log(`Secure data: ${JSON.stringify(secureData)}`);

                const result = await databases.createDocument(
                    DATABASE_ID,
                    table,
                    'unique()',
                    secureData,
                    [
                        Permission.read(Role.any()),           // Anyone can read (public gallery)
                        Permission.update(Role.user(userId)),  // Only owner can update
                        Permission.delete(Role.user(userId))   // Only owner can delete
                    ]
                );

                log(`Successfully created ${table} document: ${result.$id}`);
                return res.json(result);
            } catch (createError) {
                error(`Error creating document in ${table}: ${createError.message}`);
                return res.json({ error: `Failed to create document: ${createError.message}` }, 500);
            }
        }

        if (mode === 'update') {
            if (!docId) {
                return res.json({ error: 'Document ID required for update' }, 400);
            }

            try {
                // Verify ownership before update
                const currentDoc = await databases.getDocument(DATABASE_ID, table, docId);
                const isOwner = (currentDoc.created_by === userId) || (currentDoc.user_id === userId);
                
                if (!isOwner) {
                    return res.json({ error: 'Forbidden: You can only update your own documents' }, 403);
                }

                // Preserve immutable fields based on table type
                let secureData = {
                    ...data,
                    user_id: currentDoc.user_id       // Never let caller change owner
                };
                
                // Only add created_by/created_at/updated_at for tables that support them
                if (table !== 'settings') {
                    secureData.created_by = currentDoc.created_by;
                    secureData.created_at = currentDoc.created_at;
                    secureData.updated_at = new Date().toISOString();
                }

                log(`Updating ${table} document ${docId} for user ${userId}`);

                const result = await databases.updateDocument(
                    DATABASE_ID,
                    table, 
                    docId,
                    secureData
                );

                log(`Successfully updated ${table} document: ${result.$id}`);
                return res.json(result);
            } catch (updateError) {
                error(`Error updating document in ${table}: ${updateError.message}`);
                return res.json({ error: `Failed to update document: ${updateError.message}` }, 500);
            }
        }

        return res.json({ error: 'Invalid mode. Use "create" or "update"' }, 400);
        
    } catch (err) {
        error(`Function error: ${err.message}`);
        return res.json({ error: err.message }, 500);
    }
};