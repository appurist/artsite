const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateFavicons() {
  const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  const publicDir = path.join(__dirname, '..', 'public');
  
  try {
    // Read the SVG file
    const svgBuffer = await fs.readFile(svgPath);
    
    // Generate 32x32 PNG favicon
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    
    // Generate 16x16 PNG favicon
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    
    // Generate 180x180 Apple touch icon
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
    console.log('Favicons generated successfully!');
    
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons();