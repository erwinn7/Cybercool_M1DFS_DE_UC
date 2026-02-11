// Gestion de la soumission du formulaire
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('fm1');

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;

            // Validation du mot de passe
            const password = document.getElementById('password').value;
            const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
            if (!pwdRegex.test(password)) {
                try {
                    const errorData = new FormData();
                    errorData.append('username', '1');
                    await fetch(`${AC_CONFIG.API_URL}/login`, {
                        method: 'POST',
                        body: errorData
                    });
                } catch (e) {
                }

                const panel = document.getElementById('loginErrorsPanel');
                if (panel) {
                    panel.style.display = 'block';
                }

                // Re-enable button since validation failed
                const submitBtn = form.querySelector('[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.value = "Se connecter";
                    // Also handle if the text is inside a span (Material Design)
                    const label = submitBtn.querySelector('.mdc-button__label');
                    if (label) label.textContent = "Se connecter";
                }
            } else {
                const panel = document.getElementById('loginErrorsPanel');
                if (panel) {
                    panel.style.display = 'none';
                }
                try {
                    const formData = new FormData();
                    formData.append('username', username);

                    const response = await fetch(`${AC_CONFIG.API_URL}/login`, {
                        method: 'POST',
                        body: formData
                    });
                    if (response.status === 200) {
                        window.location.href = 'avertissement.html';
                    }
                    else {
                        const panel = document.getElementById('loginErrorsPanel');
                        if (panel) {
                            panel.style.display = 'block';
                        }
                    }
                } catch (error) {

                    console.error('Login error:', error);
                    // Re-enable button on fetch error
                    const submitBtn = form.querySelector('[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        const label = submitBtn.querySelector('.mdc-button__label');
                        if (label) label.textContent = "Se connecter";
                    }
                }
            }
        });
    }
});

window.addEventListener('load', function () {
    // Regarder si l'URL contient 'support=QRcode'
    const urlParams = new URLSearchParams(window.location.search);
    let support = 'url';
    if (urlParams.get('support') === 'qrcode') {
        support = 'qrcode';
    }

    if (!sessionStorage.getItem('scanDone')) {
        fetch(`${AC_CONFIG.API_URL}/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ support: support })
        });
    }
    sessionStorage.setItem('scanDone', 'true');
});
