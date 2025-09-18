import { useParams } from '@solidjs/router';

function ArtworkDetailPage() {
  const params = useParams();

  return (
    <div class="page-container">
      <div class="page-header">
        <h1>Artwork Detail</h1>
      </div>
      <div class="page-content">
        <p>Artwork ID: {params.id}</p>
        <p>Artwork detail page - Coming soon!</p>
      </div>
    </div>
  );
}

export default ArtworkDetailPage;