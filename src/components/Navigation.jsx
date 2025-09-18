import { Show, createSignal, createEffect } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import homeIcon from '../assets/icons/home.svg';
import imageMultipleIcon from '../assets/icons/image-multiple.svg';
import cogIcon from '../assets/icons/cog.svg';
import userIcon from '../assets/icons/user.svg';
import loginIcon from '../assets/icons/login.svg';
import logoutIcon from '../assets/icons/logout.svg';

function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const { focusUser, siteTitle } = useSettings();
  const location = useLocation();
  const [isHidden, setIsHidden] = createSignal(false);

  // Hide navigation in focus mode
  createEffect(() => {
    setIsHidden(focusUser() !== '*');
  });

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
  };

  return (
    <Show when={!isHidden()}>
      <nav id="main-nav">
        <div class="nav-content">
          <A href="/" class="logo" id="site-title">
            <img src={homeIcon} alt="Home" class="site-icon" aria-hidden="true" />
            {siteTitle()}
          </A>
          <ul class="nav-menu">
            <li>
              <A href="/" class="nav-link" classList={{ active: location.pathname === '/' || location.pathname.startsWith('/@') }}>
                <img src={homeIcon} alt="Home" class="nav-icon" aria-hidden="true" />
                <span>Home</span>
              </A>
            </li>
            
            <Show when={isAuthenticated()}>
              <li>
                <A href="/art" class="nav-link" classList={{ active: location.pathname === '/art' }}>
                  <img src={imageMultipleIcon} alt="My Art" class="nav-icon" aria-hidden="true" />
                  <span>My Art</span>
                </A>
              </li>
              
              <li>
                <A href="/site" class="nav-link" classList={{ active: location.pathname === '/site' }}>
                  <img src={cogIcon} alt="My Site" class="nav-icon" aria-hidden="true" />
                  <span>My Site</span>
                </A>
              </li>
              
              <li classList={{ active: location.pathname === '/profile' }}>
                <A href="/profile" class="nav-user-name">
                  <img src={userIcon} alt="Profile" class="user-icon" aria-hidden="true" />
                  {user()?.name || user()?.email}
                </A>
              </li>
            </Show>
            
            <li>
              <Show 
                when={isAuthenticated()} 
                fallback={
                  <A href="/login" class="nav-link">
                    <img src={loginIcon} alt="Login" class="nav-icon" aria-hidden="true" />
                    <span>Login</span>
                  </A>
                }
              >
                <a href="#" class="nav-link" onClick={handleLogout}>
                  <img src={logoutIcon} alt="Logout" class="nav-icon" aria-hidden="true" />
                  <span>Logout</span>
                </a>
              </Show>
            </li>
          </ul>
        </div>
      </nav>
    </Show>
  );
}

export default Navigation;