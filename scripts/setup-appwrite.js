import { Client, Databases, Storage } from 'appwrite';

// Initialize Appwrite client with your credentials
const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('artsite'); // Your project ID

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = 'artgallery';
const ARTWORKS_COLLECTION_ID = 'artworks';
const SETTINGS_COLLECTION_ID = 'settings';
const STORAGE_BUCKET_ID = 'images';

async function setupDatabase() {
    try {
        console.log('🚀 Setting up Appwrite database and collections...');
        
        // Create database
        console.log('📁 Creating database...');
        try {
            await databases.create(DATABASE_ID, 'Art Gallery Database');
            console.log('✅ Database created successfully');
        } catch (error) {
            if (error.code === 409) {
                console.log('✅ Database already exists');
            } else {
                throw error;
            }
        }

        // Create artworks collection
        console.log('🎨 Creating artworks collection...');
        try {
            await databases.createCollection(
                DATABASE_ID,
                ARTWORKS_COLLECTION_ID,
                'Artworks',
                ['read("any")'], // Anyone can read
                ['write("users")'] // Only authenticated users can write
            );
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
                { key: 'filename', type: 'string', size: 255, required: false },
                { key: 'created_at', type: 'datetime', required: true }
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
            await databases.createCollection(
                DATABASE_ID,
                SETTINGS_COLLECTION_ID,
                'Settings',
                ['read("any")'], // Anyone can read settings
                ['write("users")'] // Only authenticated users can write
            );
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

    } catch (error) {
        console.error('❌ Error setting up database:', error);
    }
}

async function setupStorage() {
    try {
        console.log('🗄️ Creating storage bucket...');
        
        await storage.createBucket(
            STORAGE_BUCKET_ID,
            'Images',
            ['read("any")'], // Anyone can read images
            ['write("users")'], // Only authenticated users can upload
            true, // Enabled
            undefined, // No max file size limit
            ['jpg', 'jpeg', 'png', 'gif', 'webp'], // Allowed file extensions
            'gzip', // Compression
            true, // Encryption
            true // Antivirus
        );
        console.log('✅ Storage bucket created successfully');
        
    } catch (error) {
        if (error.code === 409) {
            console.log('✅ Storage bucket already exists');
        } else {
            console.error('❌ Error creating storage bucket:', error);
        }
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

async function main() {
    console.log('🎨 Art Gallery Appwrite Setup');
    console.log('================================');
    
    await setupDatabase();
    await setupStorage();
    await seedInitialSettings();
    
    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Create an admin user in your Appwrite console');
    console.log('2. Make sure your platform has the correct allowed origins');
    console.log('3. Test the login functionality');
}

main().catch(console.error);