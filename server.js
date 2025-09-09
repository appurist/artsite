require('dotenv').config();

const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sharp = require('sharp');

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN || 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.PASSWORD || 'admin123', 10);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
// Serve uploaded files from persistent volume
app.use('/uploads', express.static(path.join(dataPath, 'uploads')));
app.set('view engine', 'ejs');

// Disable view caching to ensure config changes are reflected
app.set('view cache', false);

// Session configuration - File-based session store for persistence
const FileStore = require('session-file-store')(session);

// Use persistent volume in production, local storage in development
const dataPath = process.env.NODE_ENV === 'production' ? '/app/data' : './data';

app.use(session({
  store: new FileStore({
    path: path.join(dataPath, 'sessions'),
    ttl: 86400, // 24 hours in seconds
    reapInterval: 3600 // Clean up expired sessions every hour
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Create upload directories
const createDirectories = async () => {
  try {
    await fs.mkdir('public', { recursive: true });
    await fs.mkdir('public/css', { recursive: true });
    await fs.mkdir('public/js', { recursive: true });
    await fs.mkdir('views', { recursive: true });
    await fs.mkdir('views/admin', { recursive: true });
    
    // Create persistent data directories
    await fs.mkdir(dataPath, { recursive: true });
    await fs.mkdir(path.join(dataPath, 'uploads'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'uploads/full'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'uploads/thumbs'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'sessions'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'config'), { recursive: true });
    await fs.mkdir('views/public', { recursive: true });
  } catch (err) {
    console.log('Directories created or already exist');
  }
};

createDirectories();

// Site configuration helpers
const getSiteConfig = async () => {
  try {
    const configPath = path.join(dataPath, 'config', 'site.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (err) {
    // Return default config if file doesn't exist
    return {
      site: {
        title: "Art Gallery",
        subtitle: "Original paintings and artwork",
        description: "A collection of original artwork and paintings",
        theme: {
          primaryColor: "#667eea",
          secondaryColor: "#764ba2"
        }
      },
      artist: {
        name: "",
        bio: "",
        statement: "",
        image: "",
        email: "",
        phone: "",
        website: ""
      },
      pages: {
        about: { enabled: true, title: "About the Artist", content: "" },
        contact: { enabled: true, title: "Contact", content: "" },
        blog: { enabled: false, title: "Blog" }
      }
    };
  }
};

const saveSiteConfig = async (config) => {
  try {
    await fs.mkdir(path.join(dataPath, 'config'), { recursive: true });
    const configPath = path.join(dataPath, 'config', 'site.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving site config:', err);
    return false;
  }
};

// Helper functions
const getArtworkList = async () => {
  try {
    const fullDir = path.join(dataPath, 'uploads/full');
    const files = await fs.readdir(fullDir);
    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    const artworks = [];
    let id = 1;

    for (const imageFile of imageFiles) {
      const baseName = path.parse(imageFile).name;
      const metadataFile = path.join(dataPath, 'uploads/full', `${baseName}.json`);
      const thumbnailFile = `thumb_${imageFile}`;

      let metadata = {
        title: baseName.replace(/[-_]/g, ' '),
        description: '',
        medium: '',
        dimensions: '',
        year_created: null,
        price: '',
        tags: ''
      };

      try {
        const metadataContent = await fs.readFile(metadataFile, 'utf8');
        metadata = { ...metadata, ...JSON.parse(metadataContent) };
      } catch (err) {
        // No metadata file or invalid JSON, use defaults
      }

      // Check if thumbnail exists
      const thumbnailPath = path.join(dataPath, 'uploads/thumbs', thumbnailFile);
      let hasThumbnail = false;
      try {
        await fs.access(thumbnailPath);
        hasThumbnail = true;
      } catch (err) {
        // Create thumbnail if it doesn't exist
        try {
          await sharp(path.join(fullDir, imageFile))
            .resize(300, 300, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toFile(thumbnailPath);
          hasThumbnail = true;
        } catch (sharpErr) {
          console.log('Error creating thumbnail:', sharpErr);
        }
      }

      artworks.push({
        id: id++,
        ...metadata,
        image_filename: imageFile,
        thumbnail_filename: hasThumbnail ? thumbnailFile : imageFile,
        created_at: new Date().toISOString()
      });
    }

    // Sort by filename (most recent first if using date-based naming)
    return artworks.reverse();
  } catch (err) {
    console.error('Error reading artwork directory:', err);
    return [];
  }
};

const saveArtworkMetadata = async (imageFilename, metadata) => {
  const baseName = path.parse(imageFilename).name;
  const metadataFile = path.join(dataPath, 'uploads/full', `${baseName}.json`);

  try {
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving metadata:', err);
    return false;
  }
};

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(dataPath, 'uploads/full/'));
  },
  filename: function (req, file, cb) {
    // Use original filename, sanitize it for safety
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitizedName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.redirect('/admin/login');
  }
};

// Routes

// Public gallery routes
app.get('/', async (req, res) => {
  try {
    const artworks = await getArtworkList();
    const config = await getSiteConfig();
    res.render('public/gallery', { artworks, config });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/artwork/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const artworks = await getArtworkList();
    const artwork = artworks.find(a => a.id === id);
    const config = await getSiteConfig();

    if (!artwork) {
      return res.status(404).send('Artwork not found');
    }

    res.render('public/artwork', { artwork, config });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Additional public pages
app.get('/about', async (req, res) => {
  try {
    const config = await getSiteConfig();
    if (!config.pages.about.enabled) {
      return res.status(404).send('Page not found');
    }
    res.render('public/about', { config });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/contact', async (req, res) => {
  try {
    const config = await getSiteConfig();
    if (!config.pages.contact.enabled) {
      return res.status(404).send('Page not found');
    }
    res.render('public/contact', { config });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Admin login routes
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    req.session.authenticated = true;
    req.session.username = username;
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', { error: 'Invalid username or password' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Admin routes
app.get('/admin', requireAuth, (req, res) => {
  res.redirect('/admin/dashboard');
});

// Admin dashboard routes
app.get('/admin/dashboard', requireAuth, async (req, res) => {
  try {
    const artworks = await getArtworkList();
    res.render('admin/dashboard', { artworks, username: req.session.username });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/admin/upload', requireAuth, (req, res) => {
  res.render('admin/upload', { error: null, success: null });
});

app.get('/admin/settings', requireAuth, async (req, res) => {
  try {
    const config = await getSiteConfig();
    res.render('admin/settings', { config, error: null, success: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/admin/settings', requireAuth, async (req, res) => {
  try {
    const config = await getSiteConfig();

    // Update site settings
    config.site.title = req.body.site_title || config.site.title;
    config.site.subtitle = req.body.site_subtitle || config.site.subtitle;
    config.site.description = req.body.site_description || config.site.description;
    config.site.theme.primaryColor = req.body.primary_color || config.site.theme.primaryColor;
    config.site.theme.secondaryColor = req.body.secondary_color || config.site.theme.secondaryColor;

    // Update artist info
    config.artist.name = req.body.artist_name || config.artist.name;
    config.artist.bio = req.body.artist_bio || config.artist.bio;
    config.artist.statement = req.body.artist_statement || config.artist.statement;
    config.artist.email = req.body.artist_email || config.artist.email;
    config.artist.phone = req.body.artist_phone || config.artist.phone;
    config.artist.website = req.body.artist_website || config.artist.website;

    // Update page settings
    config.pages.about.enabled = req.body.about_enabled === 'on';
    config.pages.about.title = req.body.about_title || config.pages.about.title;
    config.pages.about.content = req.body.about_content || config.pages.about.content;

    config.pages.contact.enabled = req.body.contact_enabled === 'on';
    config.pages.contact.title = req.body.contact_title || config.pages.contact.title;
    config.pages.contact.content = req.body.contact_content || config.pages.contact.content;

    config.pages.blog.enabled = req.body.blog_enabled === 'on';
    config.pages.blog.title = req.body.blog_title || config.pages.blog.title;

    const saved = await saveSiteConfig(config);

    if (saved) {
      res.render('admin/settings', { config, error: null, success: 'Settings saved successfully!' });
    } else {
      res.render('admin/settings', { config, error: 'Failed to save settings', success: null });
    }
  } catch (err) {
    console.error(err);
    const config = await getSiteConfig();
    res.render('admin/settings', { config, error: 'Error saving settings', success: null });
  }
});

app.get('/admin/edit/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const artworks = await getArtworkList();
    const artwork = artworks.find(a => a.id === id);

    if (!artwork) {
      return res.redirect('/admin/dashboard');
    }

    res.render('admin/edit', { artwork, error: null, success: null });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
});

app.post('/admin/edit/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const artworks = await getArtworkList();
    const artwork = artworks.find(a => a.id === id);

    if (!artwork) {
      return res.redirect('/admin/dashboard');
    }

    const { title, description, medium, dimensions, year_created, price, tags } = req.body;

    // Save updated metadata
    const metadata = {
      title: title || artwork.title,
      description: description || '',
      medium: medium || '',
      dimensions: dimensions || '',
      year_created: year_created ? parseInt(year_created) : null,
      price: price || '',
      tags: tags || ''
    };

    const saved = await saveArtworkMetadata(artwork.image_filename, metadata);

    if (saved) {
      res.render('admin/edit', { artwork: {...artwork, ...metadata}, error: null, success: 'Artwork updated successfully!' });
    } else {
      res.render('admin/edit', { artwork, error: 'Failed to save changes', success: null });
    }
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
});

app.post('/admin/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.render('admin/upload', { error: 'Please select an image file', success: null });
    }

    const { title, description, medium, dimensions, year_created, price, tags } = req.body;
    const imageFilename = req.file.filename;
    const thumbnailFilename = 'thumb_' + imageFilename;

    // Create thumbnail
    try {
      await sharp(req.file.path)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(path.join(dataPath, 'uploads/thumbs', thumbnailFilename));
    } catch (sharpErr) {
      console.log('Warning: Could not create thumbnail:', sharpErr);
    }

    // Save metadata
    const metadata = {
      title: title || path.parse(imageFilename).name,
      description: description || '',
      medium: medium || '',
      dimensions: dimensions || '',
      year_created: year_created ? parseInt(year_created) : null,
      price: price || '',
      tags: tags || ''
    };

    const saved = await saveArtworkMetadata(imageFilename, metadata);

    if (saved) {
      res.render('admin/upload', { error: null, success: 'Artwork uploaded successfully!' });
    } else {
      res.render('admin/upload', { error: 'Image uploaded but metadata could not be saved', success: null });
    }

  } catch (error) {
    console.error(error);
    res.render('admin/upload', { error: 'Error processing image', success: null });
  }
});

// Delete artwork
app.post('/admin/delete/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const artworks = await getArtworkList();
    const artwork = artworks.find(a => a.id === id);

    if (!artwork) {
      return res.redirect('/admin/dashboard');
    }

    // Delete files
    try {
      await fs.unlink(path.join(dataPath, 'uploads/full', artwork.image_filename));
      console.log('Deleted image:', artwork.image_filename);
    } catch (err) {
      console.log('Error deleting image:', err);
    }

    try {
      await fs.unlink(path.join(dataPath, 'uploads/thumbs', artwork.thumbnail_filename));
      console.log('Deleted thumbnail:', artwork.thumbnail_filename);
    } catch (err) {
      console.log('Error deleting thumbnail:', err);
    }

    // Delete metadata file
    try {
      const baseName = path.parse(artwork.image_filename).name;
      await fs.unlink(path.join(dataPath, 'uploads/full', `${baseName}.json`));
      console.log('Deleted metadata:', `${baseName}.json`);
    } catch (err) {
      console.log('Error deleting metadata:', err);
    }

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Art Gallery server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/login`);
  console.log('Default login: admin / admin123');
});
