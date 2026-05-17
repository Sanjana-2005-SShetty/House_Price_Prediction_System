// Global Chart Instances
let predictionsChart = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupNavigation();
    setupForms();
    fetchDashboardStats();
    
    // Refresh stats every 30 seconds if on dashboard or monitoring
    setInterval(() => {
        const activeTarget = document.querySelector('.nav-link.active').getAttribute('data-target');
        if (activeTarget === 'dashboard' || activeTarget === 'monitoring') {
            fetchDashboardStats();
        }
    }, 30000);
});

// Theme Management
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Check local storage or system preference
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.remove('dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        document.documentElement.classList.add('dark');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        } else {
            localStorage.setItem('theme', 'light');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        }
        
        // Redraw charts for theme change
        if (predictionsChart) predictionsChart.update();
    });
}

// Navigation (SPA logic)
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active classes
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active-section'));
            sections.forEach(s => s.classList.add('hidden'));
            
            // Add active class to clicked
            link.classList.add('active');
            
            // Show target section
            const targetId = link.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active-section');
            
            // Update Title
            pageTitle.innerText = link.innerText;

            // Trigger specific actions based on route
            if (targetId === 'dashboard') {
                fetchDashboardStats();
            }
        });
    });
}

// Form Handling & API Integration
function setupForms() {
    // Prediction Form
    const predictForm = document.getElementById('predictionForm');
    predictForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('predictBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analyzing...';
        btn.disabled = true;
        
        const payload = {
            area: parseFloat(document.getElementById('area').value),
            bedrooms: parseInt(document.getElementById('bedrooms').value),
            age: parseFloat(document.getElementById('age').value)
        };

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('predictedPriceValue').innerText = '$' + data.predicted_price.toLocaleString();
                const resultBox = document.getElementById('resultBox');
                resultBox.classList.remove('hidden');
                
                showToast('Success', 'Prediction generated successfully.', 'success');
                fetchDashboardStats(); // Refresh stats in background
            } else {
                showToast('Error', data.error || 'Prediction failed.', 'error');
            }
        } catch (error) {
            showToast('Connection Error', 'Unable to reach the prediction server.', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // Retrain Trigger
    const retrainBtn = document.getElementById('triggerRetrainBtn');
    retrainBtn.addEventListener('click', async () => {
        const logBox = document.getElementById('retrainLogContainer');
        const log = document.getElementById('retrainLog');
        
        logBox.classList.remove('hidden');
        log.innerText = 'Initiating retraining sequence...\nConnecting to CI/CD Pipeline...';
        retrainBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
        retrainBtn.disabled = true;

        try {
            const response = await fetch('/retrain', { method: 'POST' });
            const data = await response.json();
            
            if (response.ok) {
                log.innerText += '\n\n[SUCCESS] ' + data.message + '\n' + data.logs;
                showToast('Pipeline Success', 'Model retrained and deployed.', 'success');
            } else {
                log.innerText += '\n\n[ERROR] ' + (data.error || 'Failed') + '\n' + (data.logs || '');
                showToast('Pipeline Failed', 'Retraining process encountered an error.', 'error');
            }
        } catch (error) {
            log.innerText += '\n\n[FATAL] Connection lost to Jenkins/Backend.';
            showToast('Connection Error', 'Unable to reach backend.', 'error');
        } finally {
            retrainBtn.innerHTML = '<i class="fas fa-play-circle mr-3"></i> Trigger Retraining Pipeline';
            retrainBtn.disabled = false;
        }
    });
}

// Fetch Stats and Draw Charts
async function fetchDashboardStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) return;
        const data = await response.json();
        
        // Update KPIs
        document.getElementById('kpi-total').innerText = data.total_predictions.toLocaleString();
        document.getElementById('kpi-avg').innerText = '$' + data.average_price.toLocaleString();
        document.getElementById('kpi-accuracy').innerText = data.model_accuracy;
        
        // Update Monitoring
        document.getElementById('mon-cpu').innerText = data.system_health.cpu + '%';
        document.getElementById('bar-cpu').style.width = data.system_health.cpu + '%';
        document.getElementById('mon-mem').innerText = data.system_health.memory + '%';
        document.getElementById('bar-mem').style.width = data.system_health.memory + '%';
        document.getElementById('prom-predict-count').innerText = data.total_predictions;
        
        // Update History Table
        updateHistoryTable(data.history);
        
        // Draw Chart
        drawChart(data.chart_data);
    } catch (e) {
        console.error("Failed to fetch stats", e);
    }
}

function updateHistoryTable(history) {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No recent predictions</td></tr>';
        return;
    }
    
    // Reverse to show newest first
    const reversed = [...history].reverse();
    
    reversed.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';
        
        tr.innerHTML = `
            <td class="px-4 py-3 font-mono text-xs text-gray-500">${item.timestamp.split(' ')[1]}</td>
            <td class="px-4 py-3">${item.area} sqft</td>
            <td class="px-4 py-3">${item.bedrooms}</td>
            <td class="px-4 py-3">${item.age} yrs</td>
            <td class="px-4 py-3 font-bold text-green-600 dark:text-green-400">$${item.predicted_price.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

function drawChart(chartData) {
    const ctx = document.getElementById('predictionsChart');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    if (predictionsChart) {
        predictionsChart.data.labels = chartData.labels;
        predictionsChart.data.datasets[0].data = chartData.prices;
        predictionsChart.options.scales.x.ticks.color = textColor;
        predictionsChart.options.scales.y.ticks.color = textColor;
        predictionsChart.options.scales.x.grid.color = gridColor;
        predictionsChart.options.scales.y.grid.color = gridColor;
        predictionsChart.update();
        return;
    }

    predictionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Predicted Price ($)',
                data: chartData.prices,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#8b5cf6',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

// Toast Notification System
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    
    toast.className = 'fixed top-5 right-5 transform transition-all duration-300 z-50 flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg';
    
    if (type === 'success') {
        toast.classList.add('text-green-800', 'bg-green-50', 'dark:bg-gray-800', 'dark:text-green-400', 'border', 'border-green-300');
        toastIcon.className = 'fas fa-check-circle mr-3 text-lg';
    } else {
        toast.classList.add('text-red-800', 'bg-red-50', 'dark:bg-gray-800', 'dark:text-red-400', 'border', 'border-red-300');
        toastIcon.className = 'fas fa-exclamation-circle mr-3 text-lg';
    }
    
    toastTitle.innerText = title;
    toastMessage.innerText = message;
    
    // Slide in
    toast.classList.remove('translate-x-full', 'opacity-0');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
    }, 3000);
}
