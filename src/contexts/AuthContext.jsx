import { createContext, useContext, createSignal, onMount } from 'solid-js';
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api.js';

const AuthContext = createContext();

export function AuthProvider(props) {
  const [user, setUser] = createSignal(null);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);

  // Check authentication status on mount
  onMount(() => {
    const checkAuth = async () => {
      try {
        // Check if there's a stored token first
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.log('No active session:', error);
        // Clear invalid token
        localStorage.removeItem('token');
      } finally {
        console.log('Setting auth loading to false');
        setIsLoading(false);
      }
    };

    checkAuth();
  });

  const login = async (email, password) => {
    const result = await apiLogin(email, password);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(true);
    return result;
  };

  const register = async (email, password, name) => {
    const result = await apiRegister(email, password, name);
    return result;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      // Always clear local state even if API call fails
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const authContextValue = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}