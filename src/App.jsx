import { Router, Route } from '@solidjs/router';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Layout from './components/Layout';
import GalleryPage from './pages/GalleryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ArtPage from './pages/ArtPage';
import ArtworkDetailPage from './pages/ArtworkDetailPage';
import ArtistProfilePage from './pages/ArtistProfilePage';
import UploadPage from './pages/UploadPage';
import EditArtworkPage from './pages/EditArtworkPage';
import SitePage from './pages/SitePage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router root={Layout}>
          <Route path="/" component={GalleryPage} />
          <Route path="/@:userId" component={GalleryPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/art" component={ArtPage} />
          <Route path="/art/upload" component={UploadPage} />
          <Route path="/art/:id/edit" component={EditArtworkPage} />
          <Route path="/art/:id" component={ArtworkDetailPage} />
          <Route path="/artist/:id" component={ArtistProfilePage} />
          <Route path="/site" component={SitePage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/about" component={AboutPage} />
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;