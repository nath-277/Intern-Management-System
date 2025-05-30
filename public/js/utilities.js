// Dark mode handling
const darkMode = {
    toggle() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
        this.updateIcon();
    },
    
    updateIcon() {
        const icon = document.getElementById('darkModeIcon');
        icon.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
    },
    
    init() {
        if (localStorage.getItem('darkMode') === 'true') {
            document.documentElement.classList.add('dark');
        }
        this.updateIcon();
    }
};

// Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg transform transition-all duration-300 
        ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white z-50`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Modal handling
const modals = {
    open(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        document.getElementById(modalId).classList.add('flex');
    },
    
    close(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        document.getElementById(modalId).classList.remove('flex');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    darkMode.init();
});