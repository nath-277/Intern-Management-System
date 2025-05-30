document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');

    // Check initial dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        updateIcon(true);
    }

    // Add click event listener
    darkModeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark);
        updateIcon(isDark);
    });

    function updateIcon(isDark) {
        darkModeIcon.textContent = isDark ? '☀️' : '🌙';
    }
});