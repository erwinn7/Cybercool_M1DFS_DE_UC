let countFormLogin = -1
let countFormLoginVerified = -1

let bucketsLogin = null
let bucketsLoginVerified = null
let bucketsScanQr = null
let bucketsScanUrl = null
let bucketsLinkClick = null

// Timeline chart instances for updating
let loginTimelineChart = null
let scanTimelineChart = null
let linkClickTimelineChart = null

function bucketByHour(arr) {
    const map = new Map();
    if (!arr || arr.length === 0) {
        return []
    }
    arr.forEach(ts => {
        const d = new Date(ts)
        d.setMinutes(0, 0, 0)
        const key = d.toISOString()
        map.set(key, (map.get(key) || 0) + 1)

    })
    return [...map.entries()]
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([k, v]) => ({ hour: k, count: v }))
};

function bucketByHourOfDay(arr) {
    const hourlyCounts = Array(24).fill(0);
    if (!arr || arr.length === 0) {
        return hourlyCounts;
    }

    arr.forEach(ts => {
        const hour = new Date(ts).getHours();
        if (hour >= 0 && hour < 24) {
            hourlyCounts[hour]++;
        }
    });
    return hourlyCounts;
}

function countByLinkName(linkClicksDetails) {
    const counts = {};
    if (!linkClicksDetails || linkClicksDetails.length === 0) {
        return counts;
    }

    linkClicksDetails.forEach(click => {
        const name = click.link_name || 'unknown';
        counts[name] = (counts[name] || 0) + 1;
    });

    return counts;
}

function generateHourlyLabels(startDate, endDate) {
    const labels = [];
    let currentDate = new Date(startDate);
    currentDate.setMinutes(0, 0, 0);

    while (currentDate <= endDate) {
        labels.push(currentDate.toISOString());
        currentDate.setHours(currentDate.getHours() + 1);
    }

    return labels;
}

function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = Math.floor(progress * (end - start) + start);
        element.textContent = currentValue.toLocaleString('fr-FR');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Couleurs pour les types de liens
const linkColors = {
    'video_1': 'rgba(231, 76, 60, 0.8)',
    'video_2': 'rgba(155, 89, 182, 0.8)',
    'youtube_link_1': 'rgba(241, 196, 15, 0.8)',
    'youtube_link_2': 'rgba(230, 126, 34, 0.8)',
    'anssi_official': 'rgba(46, 204, 113, 0.8)',
    'unknown': 'rgba(149, 165, 166, 0.8)'
};

function getLinkColor(linkName) {
    return linkColors[linkName] || `hsl(${Math.random() * 360}, 70%, 60%)`;
}

// Format date for datetime-local input
function formatDateTimeLocal(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Initialize default dates (2 months ago to now)
function getDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);
    return { startDate, endDate };
}

// Update all timeline charts with new date range
function updateTimelineCharts(startDate, endDate) {
    const timelineLabels = generateHourlyLabels(startDate, endDate);

    const bucketsLoginMap = new Map(bucketsLogin.map(item => [item.hour, item.count]));
    const bucketsLoginVerifiedMap = new Map(bucketsLoginVerified.map(item => [item.hour, item.count]));
    const bucketsScanQrMap = new Map(bucketsScanQr.map(item => [item.hour, item.count]));
    const bucketsScanUrlMap = new Map(bucketsScanUrl.map(item => [item.hour, item.count]));
    const bucketsLinkClickMap = new Map(bucketsLinkClick.map(item => [item.hour, item.count]));

    const loginTimelineData = timelineLabels.map(hour => bucketsLoginMap.get(hour) || 0);
    const loginVerifiedTimelineData = timelineLabels.map(hour => bucketsLoginVerifiedMap.get(hour) || 0);
    const scanQrTimelineData = timelineLabels.map(hour => bucketsScanQrMap.get(hour) || 0);
    const scanUrlTimelineData = timelineLabels.map(hour => bucketsScanUrlMap.get(hour) || 0);
    const linkClickTimelineData = timelineLabels.map(hour => bucketsLinkClickMap.get(hour) || 0);

    const formattedTimelineLabels = timelineLabels.map(h =>
        new Date(h).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit' }) + 'h'
    );

    // Update login timeline chart
    loginTimelineChart.data.labels = formattedTimelineLabels;
    loginTimelineChart.data.datasets[0].data = loginTimelineData;
    loginTimelineChart.data.datasets[1].data = loginVerifiedTimelineData;
    loginTimelineChart.update();

    // Update scan timeline chart
    scanTimelineChart.data.labels = formattedTimelineLabels;
    scanTimelineChart.data.datasets[0].data = scanQrTimelineData;
    scanTimelineChart.data.datasets[1].data = scanUrlTimelineData;
    scanTimelineChart.update();

    // Update link click timeline chart
    linkClickTimelineChart.data.labels = formattedTimelineLabels;
    linkClickTimelineChart.data.datasets[0].data = linkClickTimelineData;
    linkClickTimelineChart.update();
}

window.addEventListener('load', async function () {

    // Set default dates in inputs
    const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDates();
    document.getElementById('startDate').value = formatDateTimeLocal(defaultStart);
    document.getElementById('endDate').value = formatDateTimeLocal(defaultEnd);

    // Add event listener for date filter button
    document.getElementById('applyDateFilter').addEventListener('click', function () {
        const startInput = document.getElementById('startDate').value;
        const endInput = document.getElementById('endDate').value;

        if (startInput && endInput) {
            const startDate = new Date(startInput);
            const endDate = new Date(endInput);

            if (startDate <= endDate) {
                updateTimelineCharts(startDate, endDate);
            } else {
                alert('La date de début doit être antérieure à la date de fin.');
            }
        }
    });

    try {
        const response = await fetch(`${AC_CONFIG.API_URL}/stats`, {
            method: 'GET'
        });
        if (response.ok) {
            const data = await response.json()
            console.log(data)
            const dataStats = data.dataStats
            countFormLogin = dataStats.count_form_login
            countFormLoginVerified = dataStats.count_form_login_verified
            const countVisiteLinks = dataStats.count_visite_links || 0

            const dataVisits = data.dataVisits
            const loginTime = dataVisits.loginTime
            const loginTimeVerified = dataVisits.loginTimeVerified
            const scanTimeQr = dataVisits.scanTimeQr
            const scanTimeUrl = dataVisits.scanTimeUrl
            const linkClickTime = dataVisits.linkClick || []

            // Détails des clics par lien
            const linkClicksDetails = data.linkClicksDetails || []

            // Animation des KPIs
            const countScanQr = scanTimeQr?.length || 0;
            const countScanUrl = scanTimeUrl?.length || 0;
            const totalScans = countScanQr + countScanUrl;
            animateValue(document.getElementById('countScanQr'), 0, countScanQr, 1500);
            animateValue(document.getElementById('countScanUrl'), 0, countScanUrl, 1500);
            animateValue(document.getElementById('countTotalScans'), 0, totalScans, 1500);
            animateValue(document.getElementById('countFormLogin'), 0, countFormLogin || 0, 1500);
            animateValue(document.getElementById('countFormLoginVerified'), 0, countFormLoginVerified || 0, 1500);
            animateValue(document.getElementById('countLinkClicks'), 0, countVisiteLinks, 1500);



            bucketsLogin = bucketByHour(loginTime);
            bucketsLoginVerified = bucketByHour(loginTimeVerified);
            bucketsScanQr = bucketByHour(scanTimeQr);
            bucketsScanUrl = bucketByHour(scanTimeUrl);
            bucketsLinkClick = bucketByHour(linkClickTime);

            const hourlyLogins = bucketByHourOfDay(loginTime);
            const hourlyLoginsVerified = bucketByHourOfDay(loginTimeVerified);
            const hourlyScanQr = bucketByHourOfDay(scanTimeQr);
            const hourlyScanUrl = bucketByHourOfDay(scanTimeUrl);
            const hourlyLinkClicks = bucketByHourOfDay(linkClickTime);

            const hoursOfDayLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}h`);

            // Chart pour les connexions (Tentatives vs Vérifiées)
            const loginCtx = document.getElementById('loginChart').getContext('2d');
            new Chart(loginCtx, {
                type: 'bar',
                data: {
                    labels: hoursOfDayLabels,
                    datasets: [{
                        label: 'Tentatives de connexion',
                        data: hourlyLogins,
                        backgroundColor: 'rgba(52, 152, 219, 0.6)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1
                    }, {
                        label: 'Connexions vérifiées',
                        data: hourlyLoginsVerified,
                        backgroundColor: 'rgba(46, 204, 113, 0.6)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });

            // Chart pour la comparaison des scans
            const scanCtx = document.getElementById('scanChart').getContext('2d');
            new Chart(scanCtx, {
                type: 'bar',
                data: {
                    labels: hoursOfDayLabels,
                    datasets: [{
                        label: 'Scans QR Code',
                        data: hourlyScanQr,
                        backgroundColor: 'rgba(231, 76, 60, 0.6)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    }, {
                        label: 'Scans URL',
                        data: hourlyScanUrl,
                        backgroundColor: 'rgba(26, 188, 156, 0.6)',
                        borderColor: 'rgba(26, 188, 156, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });

            // Chart pour les clics sur liens d'apprentissage par heure
            const linkClickCtx = document.getElementById('linkClickChart').getContext('2d');
            new Chart(linkClickCtx, {
                type: 'bar',
                data: {
                    labels: hoursOfDayLabels,
                    datasets: [{
                        label: 'Clics liens apprentissage',
                        data: hourlyLinkClicks,
                        backgroundColor: 'rgba(155, 89, 182, 0.6)',
                        borderColor: 'rgba(155, 89, 182, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });

            // Chart doughnut pour les clics par type de lien
            const linkTypeCounts = countByLinkName(linkClicksDetails);
            const linkTypeLabels = Object.keys(linkTypeCounts).map(key => {
                // Formatage des labels pour l'affichage
                if (key === 'video_1') return '🎬 Vidéo 1 (QR Code)';
                if (key === 'video_2') return '🎬 Vidéo 2 (Bonnes pratiques)';
                if (key === 'youtube_link_1') return '📺 YouTube 1';
                if (key === 'youtube_link_2') return '📺 YouTube 2';
                if (key === 'anssi_official') return '🔒 ANSSI';
                return key;
            });
            const linkTypeData = Object.values(linkTypeCounts);
            const linkTypeColors = Object.keys(linkTypeCounts).map(key => getLinkColor(key));

            const linkTypeCtx = document.getElementById('linkTypeChart').getContext('2d');
            new Chart(linkTypeCtx, {
                type: 'doughnut',
                data: {
                    labels: linkTypeLabels,
                    datasets: [{
                        data: linkTypeData,
                        backgroundColor: linkTypeColors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: 'Répartition des clics par lien'
                        }
                    }
                }
            });

            // --- GRAPHIQUES CHRONOLOGIQUES ---

            const { startDate, endDate } = getDefaultDates();
            const timelineLabels = generateHourlyLabels(startDate, endDate);

            // Préparez les données pour la chronologie
            const bucketsLoginMap = new Map(bucketsLogin.map(item => [item.hour, item.count]));
            const bucketsLoginVerifiedMap = new Map(bucketsLoginVerified.map(item => [item.hour, item.count]));
            const bucketsScanQrMap = new Map(bucketsScanQr.map(item => [item.hour, item.count]));
            const bucketsScanUrlMap = new Map(bucketsScanUrl.map(item => [item.hour, item.count]));
            const bucketsLinkClickMap = new Map(bucketsLinkClick.map(item => [item.hour, item.count]));

            const loginTimelineData = timelineLabels.map(hour => bucketsLoginMap.get(hour) || 0);
            const loginVerifiedTimelineData = timelineLabels.map(hour => bucketsLoginVerifiedMap.get(hour) || 0);
            const scanQrTimelineData = timelineLabels.map(hour => bucketsScanQrMap.get(hour) || 0);
            const scanUrlTimelineData = timelineLabels.map(hour => bucketsScanUrlMap.get(hour) || 0);
            const linkClickTimelineData = timelineLabels.map(hour => bucketsLinkClickMap.get(hour) || 0);

            const formattedTimelineLabels = timelineLabels.map(h => new Date(h).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit' }) + 'h');

            // Chart chronologique pour les connexions (Tentatives vs Vérifiées)
            const loginTimelineCtx = document.getElementById('loginTimelineChart').getContext('2d');
            loginTimelineChart = new Chart(loginTimelineCtx, {
                type: 'line',
                data: {
                    labels: formattedTimelineLabels,
                    datasets: [{
                        label: 'Tentatives de connexion',
                        data: loginTimelineData,
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1,
                        fill: true,
                        tension: 0.3
                    }, {
                        label: 'Connexions vérifiées',
                        data: loginVerifiedTimelineData,
                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });

            // Chart chronologique pour la comparaison des scans
            const scanTimelineCtx = document.getElementById('scanTimelineChart').getContext('2d');
            scanTimelineChart = new Chart(scanTimelineCtx, {
                type: 'line',
                data: {
                    labels: formattedTimelineLabels,
                    datasets: [{
                        label: 'Scans QR Code',
                        data: scanQrTimelineData,
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1,
                        fill: true,
                        tension: 0.3
                    }, {
                        label: 'Scans URL',
                        data: scanUrlTimelineData,
                        backgroundColor: 'rgba(26, 188, 156, 0.2)',
                        borderColor: 'rgba(26, 188, 156, 1)',
                        borderWidth: 1,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });

            // Chart chronologique pour les clics d'apprentissage
            const linkClickTimelineCtx = document.getElementById('linkClickTimelineChart').getContext('2d');
            linkClickTimelineChart = new Chart(linkClickTimelineCtx, {
                type: 'line',
                data: {
                    labels: formattedTimelineLabels,
                    datasets: [{
                        label: 'Clics liens apprentissage',
                        data: linkClickTimelineData,
                        backgroundColor: 'rgba(155, 89, 182, 0.2)',
                        borderColor: 'rgba(155, 89, 182, 1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }


    } catch (error) {
        console.error(error)
    }
});