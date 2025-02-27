// Utility Functions
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 3000);
}

// User Management
const ADMIN_CREDENTIALS = { userId: "adminvip", password: simpleHash("admin12345") };
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function register() {
    const newUserId = document.getElementById("newUserId")?.value.trim() || '';
    const newPassword = document.getElementById("newPassword")?.value.trim() || '';
    const confirmPassword = document.getElementById("confirmPassword")?.value.trim() || '';

    if (!newUserId || !newPassword || !confirmPassword) {
        showErrorModal("Please fill all fields");
        return;
    }

    if (newPassword !== confirmPassword) {
        showErrorModal("Passwords do not match");
        return;
    }

    if (newUserId === ADMIN_CREDENTIALS.userId) {
        showErrorModal("Cannot use reserved admin ID");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];
    if (users.some(user => user.userId === newUserId)) {
        showErrorModal("User ID already exists");
        return;
    }

    const hashedPassword = simpleHash(newPassword);
    users.push({ userId: newUserId, password: hashedPassword });
    localStorage.setItem("users", JSON.stringify(users));
    
    showToast("Registration successful! Please login.");
    setTimeout(backToLogin, 1000);
}

function login() {
    const userId = document.getElementById("userId")?.value.trim() || '';
    const password = document.getElementById("password")?.value.trim() || '';
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const hashedPassword = simpleHash(password);

    if (!userId || !password) {
        showErrorModal("Please enter both User ID and Password");
        return;
    }

    // Admin Login
    if (userId === ADMIN_CREDENTIALS.userId && hashedPassword === ADMIN_CREDENTIALS.password) {
        startSession("admin");
        transitionTo('adminContainer');
        loadAdminPanel();
        return;
    }

    // Regular User Login
    const user = users.find(u => u.userId === userId && u.password === hashedPassword);
    if (user) {
        startSession(userId);
        transitionTo('predictionContainer');
        document.getElementById("currentUser").textContent = userId;
        initializePeriod();
        startAutoPrediction();
    } else {
        showErrorModal("Invalid User ID or Password");
    }
}

function startSession(userId) {
    const session = { userId, timestamp: Date.now() };
    localStorage.setItem("session", JSON.stringify(session));
    setTimeout(checkSession, SESSION_TIMEOUT);
}

function checkSession() {
    const session = JSON.parse(localStorage.getItem("session"));
    if (!session || Date.now() - session.timestamp > SESSION_TIMEOUT) {
        logout();
        showToast("Session expired. Please login again.", 'error');
    }
}

function logout() {
    localStorage.removeItem("session");
    clearInterval(timer);
    transitionTo('loginContainer');
}

// UI Management
function transitionTo(targetId) {
    const containers = ['loginContainer', 'registerContainer', 'predictionContainer', 'adminContainer'];
    containers.forEach(id => {
        const element = document.getElementById(id);
        if (id === targetId) {
            element.classList.remove('hidden');
            element.style.display = 'block';
        } else {
            element.classList.add('hidden');
            setTimeout(() => element.style.display = 'none', 300);
        }
    });
}

function showGetPassInfo() {
    const loginContainer = document.getElementById("loginContainer");
    if (!loginContainer) return;

    loginContainer.innerHTML = `
        <div class="card">
            <h2>NOTICE</h2>
            <div class="notice">
                <p>PERFORMANCE DEPENDS UPON DEPOSIT:</p>
                <ul>
                    <li>1000 == 40% WORK</li>
                    <li>2000 == 60% WORK</li>
                    <li>5000 == 80% WORK</li>
                    <li>10000 == 90% WORK</li>
                    <li>15000 == 99% WORK</li>
                </ul>
            </div>
            <a href="https://bmbin.com/#/register?invitationCode=15823266523" class="btn primary-btn">Register & Deposit</a>
            <a href="https://t.me/TeamEarning_bot" class="btn info-btn">Message for Pass</a>
            <button class="btn secondary-btn" onclick="backToLogin()">Back to Login</button>
            <h3>HIGH DEPOSIT HIGH PERFORMANCE</h3>
        </div>`;
}

function showRegisterForm() {
    transitionTo('registerContainer');
}

function backToLogin() {
    window.location.reload();
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Admin Panel
function loadAdminPanel() {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const userList = document.getElementById("userList");
    userList.innerHTML = users.map((user, index) => `
        <li>
            ${user.userId}
            <div>
                <button class="btn info-btn" onclick="editUser(${index})">Edit</button>
                <button class="btn danger-btn" onclick="deleteUser(${index})">Delete</button>
            </div>
        </li>
    `).join('');

    document.getElementById("totalUsers").textContent = users.length;
    let totalPredictions = 0;
    users.forEach(user => {
        const history = JSON.parse(localStorage.getItem(`history_${user.userId}`)) || [];
        totalPredictions += history.length;
    });
    document.getElementById("totalPredictions").textContent = totalPredictions;
}

function editUser(index) {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const newPassword = prompt("Enter new password for " + users[index].userId);
    if (newPassword) {
        users[index].password = simpleHash(newPassword);
        localStorage.setItem("users", JSON.stringify(users));
        loadAdminPanel();
        showToast("User password updated.");
    }
}

function deleteUser(index) {
    if (confirm("Are you sure you want to delete this user?")) {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const userId = users[index].userId;
        users.splice(index, 1);
        localStorage.setItem("users", JSON.stringify(users));
        localStorage.removeItem(`history_${userId}`);
        loadAdminPanel();
        showToast("User deleted.");
    }
}

function clearUsers() {
    if (confirm("Are you sure you want to clear all users?")) {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        users.forEach(user => localStorage.removeItem(`history_${user.userId}`));
        localStorage.removeItem("users");
        loadAdminPanel();
        showToast("All users cleared.");
    }
}

// Period and Prediction Management
let periodNumber = 0;
let timer = null;

function startAutoPrediction() {
    clearInterval(timer);
    generatePrediction();
    
    const now = new Date();
    const nextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    
    timer = setTimeout(() => {
        updatePeriodNumber();
        generatePrediction();
        timer = setInterval(() => {
            updatePeriodNumber();
            generatePrediction();
        }, 60000);
    }, nextMinute);
}

function initializePeriod() {
    const currentTime = new Date();
    const startOfPeriod = new Date();
    startOfPeriod.setHours(5, 30, 0, 0);

    const minutesSinceStart = Math.floor((currentTime - startOfPeriod) / 60000);
    periodNumber = minutesSinceStart >= 0 ? minutesSinceStart + 1 : 1;
    updatePeriodDisplay();
    loadHistory();
}

function updatePeriodNumber() {
    periodNumber = (periodNumber % 1440) + 1;
    updatePeriodDisplay();
}

function updatePeriodDisplay() {
    const periodElement = document.getElementById("periodNumber");
    if (periodElement) {
        periodElement.innerText = `Period: ${String(periodNumber).padStart(4, '0')}`;
    }
}

function generatePrediction() {
    const patterns = ["dragon", "repeat", "increase", "decrease"];
    const bigPairs = ["1+3", "2+4"];
    const smallPairs = ["6+8", "7+9"];
    
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const isBig = Math.random() > 0.5;
    let result;

    switch (selectedPattern) {
        case "dragon":
            result = isBig 
                ? `[${bigPairs[Math.floor(Math.random() * bigPairs.length)]}] Big`
                : `[${smallPairs[Math.floor(Math.random() * smallPairs.length)]}] Small`;
            break;
        case "repeat":
            result = isBig ? `[${bigPairs[0]}] Big` : `[${smallPairs[0]}] Small`;
            break;
        case "increase":
            result = Math.random() < 0.3 
                ? `[${smallPairs[Math.floor(Math.random() * smallPairs.length)]}] Small`
                : `[${bigPairs[Math.floor(Math.random() * bigPairs.length)]}] Big`;
            break;
        case "decrease":
            result = Math.random() < 0.3 
                ? `[${bigPairs[Math.floor(Math.random() * bigPairs.length)]}] Big`
                : `[${smallPairs[Math.floor(Math.random() * smallPairs.length)]}] Small`;
            break;
        default:
            result = "Prediction Error";
    }

    const predictionElement = document.getElementById("prediction");
    if (predictionElement) {
        predictionElement.innerText = result;
        saveHistory(result);
    }
}

// History Management
function saveHistory(prediction) {
    const currentUser = JSON.parse(localStorage.getItem("session"))?.userId;
    if (!currentUser || currentUser === "admin") return;

    let history = JSON.parse(localStorage.getItem(`history_${currentUser}`)) || [];
    history.unshift({
        period: periodNumber,
        prediction: prediction,
        timestamp: new Date().toLocaleString()
    });
    if (history.length > 20) history.pop(); // Keep last 20 entries
    localStorage.setItem(`history_${currentUser}`, JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const currentUser = JSON.parse(localStorage.getItem("session"))?.userId;
    if (!currentUser || currentUser === "admin") return;

    const historyList = document.getElementById("historyList");
    const history = JSON.parse(localStorage.getItem(`history_${currentUser}`)) || [];
    historyList.innerHTML = history.map(item => 
        `<li>Period ${String(item.period).padStart(4, '0')}: ${item.prediction} (${item.timestamp})</li>`
    ).join('');
}

function filterHistory() {
    const filter = document.getElementById("historyFilter").value.toLowerCase();
    const currentUser = JSON.parse(localStorage.getItem("session"))?.userId;
    if (!currentUser || currentUser === "admin") return;

    const historyList = document.getElementById("historyList");
    const history = JSON.parse(localStorage.getItem(`history_${currentUser}`)) || [];
    historyList.innerHTML = history
        .filter(item => 
            String(item.period).includes(filter) || 
            item.timestamp.toLowerCase().includes(filter) || 
            item.prediction.toLowerCase().includes(filter)
        )
        .map(item => 
            `<li>Period ${String(item.period).padStart(4, '0')}: ${item.prediction} (${item.timestamp})</li>`
        ).join('');
}

function exportHistory() {
    const currentUser = JSON.parse(localStorage.getItem("session"))?.userId;
    if (!currentUser || currentUser === "admin") return;

    const history = JSON.parse(localStorage.getItem(`history_${currentUser}`)) || [];
    const text = history.map(item => 
        `Period ${String(item.period).padStart(4, '0')}: ${item.prediction} (${item.timestamp})`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prediction_history_${currentUser}.txt`;
    link.click();
    showToast("History exported successfully.");
}

// Modal Management
function showErrorModal(message = "An error occurred") {
    const modal = document.getElementById("errorModal");
    if (modal) {
        const messageElement = modal.querySelector(".error-message");
        if (messageElement) messageElement.textContent = message;
        modal.style.display = "flex";
    }
}

function closeModal() {
    toggleDisplay("errorModal", "none");
}

function openAdjustPeriodModal() {
    toggleDisplay("adjustPeriodModal", "flex");
}

function closeAdjustPeriodModal() {
    toggleDisplay("adjustPeriodModal", "none");
}

function updatePeriod() {
    const newPeriodInput = document.getElementById("newPeriod");
    if (!newPeriodInput) return;

    const newPeriod = parseInt(newPeriodInput.value);
    if (isNaN(newPeriod) || newPeriod < 1) {
        showErrorModal("Please enter a valid period number (positive integer)");
        return;
    }

    periodNumber = newPeriod;
    updatePeriodDisplay();
    closeAdjustPeriodModal();
    showToast("Period updated successfully.");
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
    }
    const session = JSON.parse(localStorage.getItem("session"));
    if (session) {
        if (Date.now() - session.timestamp <= SESSION_TIMEOUT) {
            if (session.userId === "admin") {
                transitionTo('adminContainer');
                loadAdminPanel();
            } else {
                transitionTo('predictionContainer');
                document.getElementById("currentUser").textContent = session.userId;
                initializePeriod();
                startAutoPrediction();
            }
        } else {
            logout();
        }
    }
    console.log("Elite Prediction System loaded.");
});