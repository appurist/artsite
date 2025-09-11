import { Client, Functions } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize Appwrite client with your credentials
const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('artsite') 
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new Functions(client);

async function deployFunction(functionId, functionDir) {
    try {
        console.log(`🚀 Deploying function: ${functionId}`);
        
        // Read function files
        const indexPath = path.join(functionDir, 'index.js');
        const packagePath = path.join(functionDir, 'package.json');
        
        if (!fs.existsSync(indexPath)) {
            throw new Error(`Function file not found: ${indexPath}`);
        }
        
        const functionCode = fs.readFileSync(indexPath, 'utf8');
        const packageJson = fs.existsSync(packagePath) ? 
            fs.readFileSync(packagePath, 'utf8') : 
            '{"name":"' + functionId + '","version":"1.0.0","type":"module"}';
        
        console.log('📁 Function files loaded from:', functionDir);
        
        // Create deployment with file stream
        const deployment = await functions.createDeployment(
            functionId,
            'unique()',
            fs.createReadStream(indexPath),
            true  // activate deployment
        );
        
        console.log(`✅ Function ${functionId} deployed successfully`);
        console.log(`   Deployment ID: ${deployment.$id}`);
        console.log(`   Status: ${deployment.status}`);
        
        return deployment;
        
    } catch (error) {
        console.error(`❌ Error deploying ${functionId}:`, error.message);
        throw error;
    }
}

async function main() {
    console.log('⚡ Appwrite Function Deployment');
    console.log('================================');
    
    // Get project root directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.dirname(__dirname);
    const functionsDir = path.join(projectRoot, 'functions');
    
    // Deploy secure-create function
    const secureCreateDir = path.join(functionsDir, 'secure-create');
    if (fs.existsSync(secureCreateDir)) {
        await deployFunction('secure-create', secureCreateDir);
    } else {
        console.log('⚠️ Secure-create function directory not found, skipping...');
    }
    
    // Add more functions here as needed
    // await deployFunction('other-function', path.join(functionsDir, 'other-function'));
    
    console.log('\n🎉 Function deployment complete!');
    console.log('\nNext steps:');
    console.log('1. Test function execution from your application');
    console.log('2. Check function logs in Appwrite console if needed');
}

main().catch(console.error);