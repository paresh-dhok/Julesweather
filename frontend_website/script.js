document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            if (!usernameInput || !passwordInput) {
                loginMessage.textContent = 'Error: Username or password field not found.';
                loginMessage.style.color = 'red';
                return;
            }

            const username = usernameInput.value;
            const password = passwordInput.value;

            // Basic client-side validation
            if (!username || !password) {
                loginMessage.textContent = 'Please enter both username and password.';
                loginMessage.style.color = 'red';
                return;
            }

            loginMessage.textContent = 'Logging in...';
            loginMessage.style.color = 'blue';

            try {
                // Assume backend is running on http://localhost:3000
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    loginMessage.textContent = 'Login successful! Redirecting...';
                    loginMessage.style.color = 'green';
                    // Store a token or session info if backend provides one
                    // For now, just redirect
                    window.location.href = "dashboard.html";
                } else {
                    loginMessage.textContent = result.message || 'Login failed. Please check your credentials.';
                    loginMessage.style.color = 'red';
                }
            } catch (error) {
                console.error('Login error:', error);
                loginMessage.textContent = 'An error occurred during login. Please try again.';
                loginMessage.style.color = 'red';
            }
        });
    }
});
