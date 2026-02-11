const AC_CONFIG = {
    API_URL: (function () {
        const hostname = window.location.hostname;
        // Check for common local development hostnames
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://127.0.0.1:8000';
        } else {
            // Production URL
            return 'https://api-cybercool.onrender.com';
        }
    })()
};
