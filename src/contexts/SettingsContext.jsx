import { createContext, useContext, createSignal, createEffect } from 'solid-js';
import { getSettings, getCustomDomainUser, getCustomDomainUserSettings } from '../api.js';

const SettingsContext = createContext();

export function SettingsProvider(props) {
  const [settings, setSettings] = createSignal({});
  const [customDomainUser, setCustomDomainUser] = createSignal(undefined);
  const [siteTitle, setSiteTitle] = createSignal(window.location.hostname);
  const [primaryColor, setPrimaryColor] = createSignal(null);
  const [secondaryColor, setSecondaryColor] = createSignal(null);

  // Load custom domain user and settings on mount
  createEffect(() => {
    (async () => {
      try {
        const currentCustomDomainUser = await getCustomDomainUser();
        setCustomDomainUser(currentCustomDomainUser);

        // Load site title and colors based on custom domain mode
        if (currentCustomDomainUser) {
          const customDomainSettings = await getCustomDomainUserSettings(currentCustomDomainUser);
          if (customDomainSettings?.site_title) {
            setSiteTitle(customDomainSettings.site_title);
            document.title = customDomainSettings.site_title;
          }
          if (customDomainSettings?.primary_color) {
            setPrimaryColor(customDomainSettings.primary_color);
          }
          if (customDomainSettings?.secondary_color) {
            setSecondaryColor(customDomainSettings.secondary_color);
          }
        } else {
          document.title = window.location.hostname;
        }
      } catch (error) {
        console.log('Could not load custom domain user or settings');
      }
    })();
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
    customDomainUser,
    siteTitle,
    setSiteTitle,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
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