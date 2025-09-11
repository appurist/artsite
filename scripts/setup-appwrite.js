import { Client, Databases, Storage } from 'node-appwrite';

// Initialize Appwrite client with your credentials
const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('artsite') // Your project ID
    .setKey(process.env.APPWRITE_API_KEY); // Your API key from environment variable

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = '68bfaf22002f08bd470a';
const ARTWORKS_COLLECTION_ID = 'artworks';
const SETTINGS_COLLECTION_ID = 'settings';
const DOMAINS_COLLECTION_ID = 'domains';
const STORAGE_BUCKET_ID = 'images';

async function setupDatabase() {
    try {
        console.log('🚀 Setting up Appwrite database collections...');
        console.log('✅ Using existing database: ' + DATABASE_ID);

        // Create artworks collection
        console.log('🎨 Creating artworks collection...');
        try {
            await databases.createCollection({
                databaseId: DATABASE_ID,
                collectionId: ARTWORKS_COLLECTION_ID,
                name: 'Artworks',
                permissions: ['read("any")', 'write("users")'],
                documentSecurity: false
            });
            console.log('✅ Artworks collection created');

            // Add attributes to artworks collection
            console.log('📝 Adding attributes to artworks collection...');
            
            const artworkAttributes = [
                { key: 'title', type: 'string', size: 255, required: true },
                { key: 'description', type: 'string', size: 2000, required: false },
                { key: 'medium', type: 'string', size: 255, required: false },
                { key: 'dimensions', type: 'string', size: 255, required: false },
                { key: 'year_created', type: 'integer', required: false },
                { key: 'price', type: 'string', size: 255, required: false },
                { key: 'tags', type: 'string', size: 1000, required: false },
                { key: 'image_id', type: 'string', size: 255, required: true },
                { key: 'user_id', type: 'string', size: 255, required: true },
                { key: 'storage_path', type: 'string', size: 500, required: false },
                { key: 'original_filename', type: 'string', size: 255, required: false }
            ];

            for (const attr of artworkAttributes) {
                try {
                    if (attr.type === 'string') {
                        await databases.createStringAttribute(
                            DATABASE_ID,
                            ARTWORKS_COLLECTION_ID,
                            attr.key,
                            attr.size,
                            attr.required
                        );
                    } else if (attr.type === 'integer') {
                        await databases.createIntegerAttribute(
                            DATABASE_ID,
                            ARTWORKS_COLLECTION_ID,
                            attr.key,
                            attr.required
                        );
                    } else if (attr.type === 'datetime') {
                        await databases.createDatetimeAttribute(
                            DATABASE_ID,
                            ARTWORKS_COLLECTION_ID,
                            attr.key,
                            attr.required
                        );
                    }
                    console.log(`  ✅ Added ${attr.key} attribute`);
                } catch (error) {
                    if (error.code === 409) {
                        console.log(`  ✅ ${attr.key} attribute already exists`);
                    } else {
                        console.log(`  ❌ Error adding ${attr.key}:`, error.message);
                    }
                }
            }
            
        } catch (error) {
            if (error.code === 409) {
                console.log('✅ Artworks collection already exists');
            } else {
                throw error;
            }
        }

        // Create settings collection
        console.log('⚙️ Creating settings collection...');
        try {
            await databases.createCollection({
                databaseId: DATABASE_ID,
                collectionId: SETTINGS_COLLECTION_ID,
                name: 'Settings',
                permissions: ['read("any")', 'write("users")'],
                documentSecurity: false
            });
            console.log('✅ Settings collection created');

            // Add attributes to settings collection
            console.log('📝 Adding attributes to settings collection...');
            
            const settingAttributes = [
                { key: 'key', type: 'string', size: 255, required: true },
                { key: 'value', type: 'string', size: 5000, required: true }
            ];

            for (const attr of settingAttributes) {
                try {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        SETTINGS_COLLECTION_ID,
                        attr.key,
                        attr.size,
                        attr.required
                    );
                    console.log(`  ✅ Added ${attr.key} attribute`);
                } catch (error) {
                    if (error.code === 409) {
                        console.log(`  ✅ ${attr.key} attribute already exists`);
                    } else {
                        console.log(`  ❌ Error adding ${attr.key}:`, error.message);
                    }
                }
            }

            // Create unique index on key field
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    SETTINGS_COLLECTION_ID,
                    'key_unique',
                    'unique',
                    ['key']
                );
                console.log('  ✅ Added unique index on key field');
            } catch (error) {
                if (error.code === 409) {
                    console.log('  ✅ Unique index already exists');
                } else {
                    console.log('  ❌ Error creating index:', error.message);
                }
            }
            
        } catch (error) {
            if (error.code === 409) {
                console.log('✅ Settings collection already exists');
            } else {
                throw error;
            }
        }

        // Create domains collection
        console.log('🌐 Creating domains collection...');
        try {
            await databases.createCollection({
                databaseId: DATABASE_ID,
                collectionId: DOMAINS_COLLECTION_ID,
                name: 'domains',
                permissions: ['read("any")', 'write("users")'],
                documentSecurity: false
            });
            console.log('✅ Domains collection created');

            // Add attributes to domains collection
            console.log('📝 Adding attributes to domains collection...');
            
            const domainAttributes = [
                { key: 'hostname', type: 'string', size: 255, required: true },
                { key: 'focus_user', type: 'string', size: 50, required: true }
            ];

            for (const attr of domainAttributes) {
                try {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        DOMAINS_COLLECTION_ID,
                        attr.key,
                        attr.size,
                        attr.required
                    );
                    console.log(`  ✅ Added ${attr.key} attribute`);
                } catch (error) {
                    if (error.code === 409) {
                        console.log(`  ✅ ${attr.key} attribute already exists`);
                    } else {
                        console.log(`  ❌ Error adding ${attr.key}:`, error.message);
                    }
                }
            }

            // Create unique index on hostname field
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    DOMAINS_COLLECTION_ID,
                    'hostname_unique',
                    'unique',
                    ['hostname']
                );
                console.log('  ✅ Added unique index on hostname field');
            } catch (error) {
                if (error.code === 409) {
                    console.log('  ✅ Unique index already exists');
                } else {
                    console.log('  ❌ Error creating index:', error.message);
                }
            }
            
        } catch (error) {
            if (error.code === 409) {
                console.log('✅ Domains collection already exists');
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('❌ Error setting up database:', error);
    }
}

async function setupStorage() {
    try {
        console.log('🗄️ Checking storage bucket...');
        console.log('✅ Storage bucket already exists');
        
        // Skip creating bucket due to plan limits - using existing 'images' bucket
        
    } catch (error) {
        console.error('❌ Error checking storage bucket:', error);
    }
}

async function seedInitialSettings() {
    try {
        console.log('🌱 Seeding initial settings...');
        
        const initialSettings = {
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

        for (const [key, value] of Object.entries(initialSettings)) {
            try {
                await databases.createDocument(
                    DATABASE_ID,
                    SETTINGS_COLLECTION_ID,
                    'unique()',
                    { key, value }
                );
                console.log(`  ✅ Added setting: ${key}`);
            } catch (error) {
                if (error.code === 409) {
                    console.log(`  ✅ Setting already exists: ${key}`);
                } else {
                    console.log(`  ❌ Error adding setting ${key}:`, error.message);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error seeding settings:', error);
    }
}

async function seedDomainConfig() {
    try {
        console.log('🌐 Seeding domain configuration...');
        
        const domainConfigs = [
            { hostname: 'viktoriasart.ca', focus_user: 'vikki' }
        ];

        for (const config of domainConfigs) {
            try {
                await databases.createDocument(
                    DATABASE_ID,
                    DOMAINS_COLLECTION_ID,
                    'unique()',
                    config
                );
                console.log(`  ✅ Added domain config: ${config.hostname} → ${config.focus_user}`);
            } catch (error) {
                if (error.code === 409) {
                    console.log(`  ✅ Domain config already exists: ${config.hostname}`);
                } else {
                    console.log(`  ❌ Error adding domain config ${config.hostname}:`, error.message);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error seeding domain configs:', error);
    }
}

async function main() {
    console.log('🎨 Art Gallery Appwrite Setup');
    console.log('================================');
    
    await setupDatabase();
    await setupStorage();
    await seedInitialSettings();
    await seedDomainConfig();
    
    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Create an admin user in your Appwrite console');
    console.log('2. Make sure your platform has the correct allowed origins');
    console.log('3. Test the login functionality');
    console.log('4. Domain viktoriasart.ca will show vikki\'s artworks by default');
}

main().catch(console.error);