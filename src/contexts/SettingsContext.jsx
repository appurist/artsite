import { createContext, useContext, createSignal, createEffect } from 'solid-js';
import { getSettings, getCustomDomainUser, getCustomDomainUserSettings } from '../api.js';

// Utility function to determine if a color is dark
function isColorDark(color) {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance (0-255, where lower values are darker)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  
  // Return true if luminance is below threshold (dark color)
  return luminance < 128;
}

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
            // Update CSS custom property
            document.documentElement.style.setProperty('--primary-color', customDomainSettings.primary_color);
            // Add dark theme class if primary color is dark
            if (isColorDark(customDomainSettings.primary_color)) {
              document.documentElement.classList.add('dark-primary');
            } else {
              document.documentElement.classList.remove('dark-primary');
            }
          }
          if (customDomainSettings?.secondary_color) {
            setSecondaryColor(customDomainSettings.secondary_color);
            // Update CSS custom property
            document.documentElement.style.setProperty('--secondary-color', customDomainSettings.secondary_color);
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