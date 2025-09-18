import { createSignal, onMount } from 'solid-js';
import Navigation from './Navigation';
import Footer from './Footer';

function Layout(props) {
  const [appVersion, setAppVersion] = createSignal(__APP_VERSION__);

  onMount(() => {
    // Set current year in footer
    const currentYear = new Date().getFullYear();
    document.documentElement.style.setProperty('--current-year', `"${currentYear}"`);
  });

  return (
    <div class="app-layout">
      <Navigation />
      
      <main id="app">
        {props.children}
      </main>

      <Footer version={appVersion()} />
    </div>
  );
}

export default Layout;