document.addEventListener('DOMContentLoaded', function() {
    // For demo purposes, set up a default user
    if (!localStorage.getItem('users')) {
        const users = [{
            username: 'demo',
            password: 'password123'
        }];
        localStorage.setItem('users', JSON.stringify(users));
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Add input animation effects
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-active');
        });
        
        input.addEventListener('blur', function() {
            if (this.value.length === 0) {
                this.parentElement.classList.remove('input-active');
            }
        });
    });

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Button animation on click
        const button = this.querySelector('.login-button');
        button.classList.add('button-clicked');
        
        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Check if user exists and password matches
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Set logged in user
            localStorage.setItem('currentUser', username);
            
            // Display success message
            errorMessage.style.display = 'block';
            errorMessage.style.color = '#4CAF50';
            errorMessage.textContent = 'Login effettuato con successo!';
            
            // Add success animation
            document.body.classList.add('login-success');
            
            // Redirect to datifisici page after successful login
            setTimeout(function() {
                window.location.href = '../datifisici/datifisici.html';
            }, 1500);
            
        } else {
            // Show error message with animation
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Username o password non validi. Riprova.';
            errorMessage.classList.add('error-shake');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                errorMessage.classList.remove('error-shake');
            }, 500);
            
            // Shake inputs to indicate error
            document.getElementById('username').classList.add('input-error');
            document.getElementById('password').classList.add('input-error');
            
            setTimeout(() => {
                document.getElementById('username').classList.remove('input-error');
                document.getElementById('password').classList.remove('input-error');
            }, 500);
        }
        
        // Remove button animation class
        setTimeout(() => {
            button.classList.remove('button-clicked');
        }, 300);
    });

    // Register link functionality with animation
    document.querySelector('.register-link').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Add click effect
        this.classList.add('link-clicked');
        
        setTimeout(() => {
            this.classList.remove('link-clicked');
            
            const username = prompt('Inserisci un nuovo username');
            if (username) {
                const password = prompt('Inserisci una nuova password ' + username + ':');
                if (password) {
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    users.push({
                        username,
                        password
                    });
                    localStorage.setItem('users', JSON.stringify(users));
                    
                    // Show success message with animation
                    errorMessage.style.display = 'block';
                    errorMessage.style.color = '#4CAF50';
                    errorMessage.textContent = 'Account Creato! Ora effettuare il login.';
                    errorMessage.classList.add('success-bounce');
                    
                    setTimeout(() => {
                        errorMessage.classList.remove('success-bounce');
                    }, 1000);
                }
            }
        }, 200);
    });
});