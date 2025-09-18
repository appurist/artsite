import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';

function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password() !== confirmPassword()) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(email(), password(), name());
      
      if (result.success === false) {
        if (result.userExists) {
          setError('This email address is already registered. Please use a different email or login if this is your account.');
        } else {
          setError(result.message || 'Registration failed. Please try again.');
        }
        return;
      }

      // Auto-login after successful registration
      await login(email(), password());
      navigate('/art');

    } catch (err) {
      setError('Registration failed. ' + (err.message || 'Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="page-container">
      <div class="admin-section">
        <div class="auth-section">
          <h2>Create Admin Account</h2>
          <form onSubmit={handleSubmit}>
            <div class="form-group">
              <label for="name">Name:</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                autocomplete="name" 
                required 
                value={name()}
                onInput={(e) => setName(e.target.value)}
              />
            </div>
            <div class="form-group">
              <label for="email">Email:</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                autocomplete="email" 
                required 
                value={email()}
                onInput={(e) => setEmail(e.target.value)}
              />
            </div>
            <div class="form-group">
              <label for="new-password">Password:</label>
              <input 
                type="password" 
                id="new-password" 
                name="new-password" 
                autocomplete="new-password" 
                required 
                minlength="8"
                value={password()}
                onInput={(e) => setPassword(e.target.value)}
              />
            </div>
            <div class="form-group">
              <label for="confirm-password">Confirm Password:</label>
              <input 
                type="password" 
                id="confirm-password" 
                name="confirm-password" 
                autocomplete="new-password" 
                required 
                minlength="8"
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error() && <div class="error-message">{error()}</div>}
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" disabled={isLoading()}>
                {isLoading() ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
          <div class="auth-switch">
            <a href="/login">Already have an account?</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;