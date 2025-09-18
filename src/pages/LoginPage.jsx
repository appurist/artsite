import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email(), password());
      navigate('/art');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="page-container">
      <div class="admin-section">
        <div class="auth-section">
          <h2>Admin Login</h2>
          <form onSubmit={handleSubmit}>
            <div class="form-group">
              <label for="username">Email:</label>
              <input 
                type="email" 
                id="username" 
                name="username" 
                autocomplete="username" 
                required 
                value={email()}
                onInput={(e) => setEmail(e.target.value)}
              />
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                autocomplete="current-password" 
                required 
                value={password()}
                onInput={(e) => setPassword(e.target.value)}
              />
            </div>
            {error() && <div class="error-message">{error()}</div>}
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" disabled={isLoading()}>
                {isLoading() ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
          <div class="auth-switch">
            <a href="/register">Don't have an account yet?</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;