import { Show, createSignal, createEffect } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import homeIcon from '../assets/icons/home.svg';

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
                <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
                </svg>
                <span>Home</span>
              </A>
            </li>
            
            <Show when={isAuthenticated()}>
              <li>
                <A href="/art" class="nav-link" classList={{ active: location.pathname === '/art' }}>
                  <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M22,16V4A2,2 0 0,0 20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16M11,12L13.03,14.71L16,11L20,16H8M2,6V20A2,2 0 0,0 4,22H18V20H4V6" />
                  </svg>
                  <span>My Art</span>
                </A>
              </li>
              
              <li>
                <A href="/site" class="nav-link" classList={{ active: location.pathname === '/site' }}>
                  <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                  </svg>
                  <span>My Site</span>
                </A>
              </li>
              
              <li classList={{ active: location.pathname === '/profile' }}>
                <A href="/profile" class="nav-user-name">
                  <svg class="user-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                  </svg>
                  {user()?.name || user()?.email}
                </A>
              </li>
            </Show>
            
            <li>
              <Show 
                when={isAuthenticated()} 
                fallback={
                  <A href="/login" class="nav-link">
                    <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M11 7L9.6 8.4L12.2 11H2V13H12.2L9.6 15.6L11 17L16 12L11 7M20 19H12V21H20C21.1 21 22 20.1 22 19V5C22 3.9 21.1 3 20 3H12V5H20V19Z" />
                    </svg>
                    <span>Login</span>
                  </A>
                }
              >
                <a href="#" class="nav-link" onClick={handleLogout}>
                  <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                  </svg>
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