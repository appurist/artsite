import { createSignal, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, createArtwork, getCurrentUser } from '../api.js';

function UploadPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [medium, setMedium] = createSignal('');
  const [dimensions, setDimensions] = createSignal('');
  const [yearCreated, setYearCreated] = createSignal('');
  const [price, setPrice] = createSignal('');
  const [tags, setTags] = createSignal('');
  const [selectedFile, setSelectedFile] = createSignal(null);
  
  // Upload state
  const [isUploading, setIsUploading] = createSignal(false);
  const [uploadStatus, setUploadStatus] = createSignal('');
  const [statusType, setStatusType] = createSignal('');

  const showUploadStatus = (message, type) => {
    setUploadStatus(message);
    setStatusType(type);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const file = selectedFile();
    if (!file) {
      showUploadStatus('Please select an image file.', 'error');
      return;
    }

    if (!title().trim()) {
      showUploadStatus('Please enter a title.', 'error');
      return;
    }

    setIsUploading(true);
    showUploadStatus('Uploading image...', 'info');

    try {
      // Get current user for file organization
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Upload file to R2 storage
      const uploadedFile = await uploadFile(file);

      showUploadStatus('Image uploaded, saving artwork details...', 'info');

      // Create artwork record
      const artworkData = {
        title: title().trim(),
        description: description().trim() || null,
        medium: medium().trim() || null,
        dimensions: dimensions().trim() || null,
        year_created: yearCreated() ? parseInt(yearCreated()) : null,
        price: price().trim() || null,
        tags: tags().trim() || null,
        artist_id: currentUser.id,
        image_id: uploadedFile.$id,
        image_url: uploadedFile.url,
        thumbnail_url: uploadedFile.thumbnailUrl,
        original_url: uploadedFile.originalUrl,
        storage_path: uploadedFile.storagePath,
        original_filename: file.name
      };

      await createArtwork(artworkData);

      showUploadStatus('Artwork uploaded successfully!', 'success');

      // Reset form and redirect after delay
      setTimeout(() => {
        navigate('/art');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      showUploadStatus('Upload failed: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <Show when={isAuthenticated()} fallback={
      <div class="page-container">
        <div class="page-content">
          <p>Please log in to upload artwork.</p>
          <A href="/login" class="btn btn-primary">Login</A>
        </div>
      </div>
    }>
      <div class="page-container">
        <div class="page-header">
          <h2>Upload Artwork</h2>
        </div>

        <div class="page-content">
          <form class="upload-form" onSubmit={handleSubmit}>
            <div class="form-group">
              <label for="artwork-file">Artwork Image *</label>
              <input 
                type="file" 
                id="artwork-file" 
                accept="image/*" 
                required 
                onChange={handleFileChange}
              />
              <small>Supported formats: JPG, PNG, GIF, WebP</small>
            </div>

            <div class="form-group">
              <label for="artwork-title">Title *</label>
              <input 
                type="text" 
                id="artwork-title" 
                required 
                maxlength="255"
                value={title()}
                onInput={(e) => setTitle(e.target.value)}
              />
            </div>

            <div class="form-group">
              <label for="artwork-description">Description</label>
              <textarea 
                id="artwork-description" 
                rows="4" 
                maxlength="2000"
                value={description()}
                onInput={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="artwork-medium">Medium</label>
                <input 
                  type="text" 
                  id="artwork-medium" 
                  maxlength="255" 
                  placeholder="Oil on canvas, Watercolor, etc."
                  value={medium()}
                  onInput={(e) => setMedium(e.target.value)}
                />
              </div>

              <div class="form-group">
                <label for="artwork-dimensions">Dimensions</label>
                <input 
                  type="text" 
                  id="artwork-dimensions" 
                  maxlength="255" 
                  placeholder='24" x 36"'
                  value={dimensions()}
                  onInput={(e) => setDimensions(e.target.value)}
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="artwork-year">Year Created</label>
                <input 
                  type="number" 
                  id="artwork-year" 
                  min="1900" 
                  max={currentYear} 
                  placeholder={currentYear.toString()}
                  value={yearCreated()}
                  onInput={(e) => setYearCreated(e.target.value)}
                />
              </div>

              <div class="form-group">
                <label for="artwork-price">Price</label>
                <input 
                  type="text" 
                  id="artwork-price" 
                  maxlength="255" 
                  placeholder="$500, Not for sale, etc."
                  value={price()}
                  onInput={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="artwork-tags">Tags</label>
              <input 
                type="text" 
                id="artwork-tags" 
                maxlength="1000" 
                placeholder="landscape, mountains, sunset (separated by commas)"
                value={tags()}
                onInput={(e) => setTags(e.target.value)}
              />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" disabled={isUploading()}>
                <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M18 15V18H15V20H18V23H20V20H23V18H20V15H18M13.3 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V13.3C20.4 13.1 19.7 13 19 13C17.9 13 16.8 13.3 15.9 13.9L14.5 12L11 16.5L8.5 13.5L5 18H13.1C13 18.3 13 18.7 13 19C13 19.7 13.1 20.4 13.3 21Z" />
                </svg>
                {isUploading() ? 'Uploading...' : 'Upload Artwork'}
              </button>
              <A href="/art" class="btn btn-secondary">
                <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22 2 17.5 2 12 6.5 2 12 2M12 4C10.1 4 8.4 4.6 7.1 5.7L18.3 16.9C19.3 15.5 20 13.8 20 12C20 7.6 16.4 4 12 4M16.9 18.3L5.7 7.1C4.6 8.4 4 10.1 4 12C4 16.4 7.6 20 12 20C13.9 20 15.6 19.4 16.9 18.3Z" />
                </svg>
                Cancel
              </A>
            </div>
          </form>

          <Show when={uploadStatus()}>
            <div class={`upload-status message ${statusType()}`} style="display: block;">
              {uploadStatus()}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}

export default UploadPage;