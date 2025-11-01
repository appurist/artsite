import { createContext, useContext, createSignal, createEffect } from 'solid-js';
import { getSettings, getFocusUser, getFocusUserSettings } from '../api.js';

const SettingsContext = createContext();

export function SettingsProvider(props) {
  const [settings, setSettings] = createSignal({});
  const [focusUser, setFocusUser] = createSignal(undefined);
  const [siteTitle, setSiteTitle] = createSignal(window.location.hostname);

  // Load focus user and settings on mount
  createEffect(async () => {
    try {
      const currentFocusUser = await getFocusUser();
      setFocusUser(currentFocusUser);

      // Load site title based on focus mode
      if (currentFocusUser) {
        const focusSettings = await getFocusUserSettings(currentFocusUser);
        if (focusSettings?.site_title) {
          setSiteTitle(focusSettings.site_title);
          document.title = focusSettings.site_title;
        }
      } else {
        document.title = window.location.hostname;
      }
    } catch (error) {
      console.log('Could not load focus user or settings');
    }
  });

  const loadSettings = async () => {
    try {
      const userSettings = await getSettings();
      setSettings(userSettings);
      return userSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return {};
    }
  };

  const settingsContextValue = {
    settings,
    setSettings,
    focusUser,
    siteTitle,
    setSiteTitle,
    loadSettings
  };

  return (
    <SettingsContext.Provider value={settingsContextValue}>
      {props.children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}