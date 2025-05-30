let currentPage = 1;
let totalPages = 1;
let activeSection = 'manage-interns';

// Show active section and hide others
function showSection(sectionId, btn) {
    activeSection = sectionId;

    // Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(item => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
    });

    // Add active to the clicked nav link
    if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
    } else {
        // fallback: activate the nav-link for the section
        const navBtn = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (navBtn) {
            navBtn.classList.add('active');
            navBtn.setAttribute('aria-current', 'page');
        }
    }

    // Show/hide content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

// Initialize first section as active
document.addEventListener('DOMContentLoaded', () => {
    showSection('manage-interns');
});

// Update the loadInterns function
async function loadInterns() {
  try {
    const year = document.getElementById('filterYear').value;
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    const limit = document.getElementById('pageLimit').value;

    const response = await fetch(
      `/api/interns?year=${year}&search=${encodeURIComponent(search)}&status=${status}&page=${currentPage}&limit=${limit}`
    );
    const { data, total, page, totalPages: tp } = await response.json();
    
    totalPages = tp;
    document.getElementById('pageInfo').textContent = `Page ${page} of ${totalPages}`;

    // Calculate duration and render cards
    document.getElementById('internList').innerHTML = data.map(intern => {
      const startDate = new Date(intern.start_date);
      const endDate = new Date(intern.end_date);
      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7));
      
      const statusColor = intern.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
      
      return `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border dark:border-gray-700 hover:shadow-lg transition-shadow">
          <div class="mb-3">
            <h3 class="font-semibold text-lg dark:text-white">${escapeHtml(intern.name)}</h3>
          </div>
          
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p><span class="font-medium">Designation:</span> ${intern.designation}</p>
            <p><span class="font-medium">Course:</span> ${intern.course}</p>
            <p><span class="font-medium">Duration:</span> ${duration} weeks</p>
            <p><span class="font-medium">Year:</span> ${intern.year}</p>
            <p><span class="font-medium">Period:</span> ${formatDate(intern.start_date)} - ${formatDate(intern.end_date)}</p>
          </div>
          
          <div class="mt-4 flex justify-between items-center">
            <span class="${statusColor} px-2 py-1 rounded-full text-sm font-medium">
              ${intern.status}
            </span>
            <div class="flex space-x-2">
              <button onclick="editIntern(${intern.id})" 
                      class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                Edit
              </button>
              <button onclick="confirmDelete(${intern.id})" 
                      class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Update statistics
    const activeCount = data.filter(intern => intern.status === 'in-progress').length;
    const completedCount = data.filter(intern => intern.status === 'completed').length;
    
    document.getElementById('totalInterns').textContent = data.length;
    document.getElementById('activeInterns').textContent = activeCount;
    document.getElementById('completedInterns').textContent = completedCount;

    // Update stats colors based on values
    document.getElementById('activeInterns').className = 
      `text-3xl font-bold ${activeCount > 0 ? 'text-green-500' : 'text-gray-500'}`;
    document.getElementById('completedInterns').className = 
      `text-3xl font-bold ${completedCount > 0 ? 'text-purple-500' : 'text-gray-500'}`;

    // Refresh stats after loading interns
    await loadDashboardStats();
  } catch (error) {
    console.error('Error:', error);
  }
}

function prevPage() {
  if(currentPage > 1) {
    currentPage--;
    loadInterns();
  }
}

function nextPage() {
  if(currentPage < totalPages) {
    currentPage++;
    loadInterns();
  }
}

// Form submission
document.getElementById('addInternForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  // Automatically set status based on dates
  const today = new Date();
  const endDate = new Date(data.end_date);
  data.status = endDate < today ? 'completed' : 'in-progress';

  try {
    const response = await fetch('/api/interns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (result.success) {
      e.target.reset();
      loadInterns();
    } else {
      throw new Error(result.error || 'Failed to add intern');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to add intern');
  }
});

// Admin registration form handling
document.getElementById('addAdminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorDiv = document.getElementById('passwordError');
  const password = document.getElementById('adminPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match';
    errorDiv.classList.remove('hidden');
    return;
  }

  const formData = new FormData(e.target);
  try {
    const response = await fetch('/api/admin/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData))
    });

    const data = await response.json();
    
    if (data.success) {
      e.target.reset();
      errorDiv.textContent = 'Admin user created successfully';
      errorDiv.classList.remove('hidden');
      errorDiv.classList.remove('text-red-500');
      errorDiv.classList.add('text-green-500');
    } else {
      errorDiv.textContent = data.error || 'Failed to create admin user';
      errorDiv.classList.remove('hidden');
      errorDiv.classList.add('text-red-500');
      errorDiv.classList.remove('text-green-500');
    }
  } catch (error) {
    errorDiv.textContent = 'An error occurred. Please try again.';
    errorDiv.classList.remove('hidden');
  }
});

// Filters
document.getElementById('filterYear').addEventListener('input', loadInterns);

// Add debounce to search
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadInterns();
    }, 300);
});

// Initial load
loadInterns();

function logout() {
  fetch('/api/admin/logout').then(() => window.location.href = '/');
}

// Add these functions to your existing script tag
function openEditModal(intern) {
  document.getElementById('editId').value = intern.id;
  document.getElementById('editName').value = intern.name;
  document.getElementById('editDesignation').value = intern.designation;
  document.getElementById('editCourse').value = intern.course;
  document.getElementById('editYear').value = intern.year;
  
  // Convert ISO dates to input format (YYYY-MM-DD)
  const startDate = new Date(intern.start_date);
  const endDate = new Date(intern.end_date);
  
  document.getElementById('editStartDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('editEndDate').value = endDate.toISOString().split('T')[0];
  
  // Show formatted dates
  const startFormatted = startDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
  const endFormatted = endDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
  
  document.getElementById('editStartDateDisplay').textContent = startFormatted;
  document.getElementById('editEndDateDisplay').textContent = endFormatted;
  
  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('editModal').classList.add('flex');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editModal').classList.remove('flex');
}

document.getElementById('editInternForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  // Format dates to dd/mm/yy before sending
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  
  data.start_date = startDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
  
  data.end_date = endDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });

  try {
    const response = await fetch(`/api/interns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update intern');
    }
    
    const result = await response.json();
    if (result.success) {
      closeEditModal();
      loadInterns();
    } else {
      throw new Error(result.error || 'Failed to update intern');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to update intern details');
  }
});

async function editIntern(id) {
  try {
    const response = await fetch(`/api/interns/${id}`);
    const intern = await response.json();
    
    if (intern) {
      document.getElementById('editId').value = intern.id;
      document.getElementById('editName').value = intern.name;
      document.getElementById('editDesignation').value = intern.designation;
      document.getElementById('editCourse').value = intern.course;
      document.getElementById('editYear').value = intern.year;
      document.getElementById('editStartDate').value = intern.start_date;
      document.getElementById('editEndDate').value = intern.end_date;
      document.getElementById('editStatus').value = intern.status;
      
      document.getElementById('editModal').classList.remove('hidden');
      document.getElementById('editModal').classList.add('flex');
    }
  } catch (error) {
    console.error('Error fetching intern details:', error);
    alert('Failed to load intern details');
  }
}

let internToDelete = null;

function confirmDelete(id) {
  internToDelete = id;
  document.getElementById('deleteModal').classList.remove('hidden');
  document.getElementById('deleteModal').classList.add('flex');
}

function closeDeleteModal() {
  internToDelete = null;
  document.getElementById('deleteModal').classList.add('hidden');
  document.getElementById('deleteModal').classList.remove('flex');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!internToDelete) return;
  
  try {
    const response = await fetch(`/api/interns/${internToDelete}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    if (result.success) {
      closeDeleteModal();
      loadInterns();
    } else {
      throw new Error(result.error || 'Failed to delete intern');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to delete intern');
  }
});

// Add error toast notification
function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function confirmDelete(id) {
  if (confirm('Are you sure you want to delete this intern?')) {
    deleteIntern(id);
  }
}

async function deleteIntern(id) {
  try {
    const response = await fetch(`/api/interns/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    if (result.success) {
      loadInterns(); // Refresh the list
    } else {
      alert(result.error || 'Failed to delete intern');
    }
  } catch (error) {
    console.error('Error deleting intern:', error);
    alert('An error occurred while deleting');
  }
}

// Helper functions
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
  });
}

// Add this function to automatically update status when editing dates
function updateStatus() {
  const endDate = new Date(document.getElementById('editEndDate').value);
  const today = new Date();
  document.getElementById('editStatus').value = endDate < today ? 'completed' : 'in-progress';
}

// Add these event listeners to the edit form
document.getElementById('editEndDate').addEventListener('change', updateStatus);

function formatDateInput(input) {
  const date = new Date(input.value);
  const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
  });
  
  // Store the formatted date in a data attribute
  input.dataset.formattedDate = formattedDate;
  
  // Show formatted date to user while keeping ISO format for form submission
  const displaySpan = input.nextElementSibling || document.createElement('span');
  if (!input.nextElementSibling) {
      displaySpan.className = 'text-sm text-gray-600 mt-1 block';
      input.parentNode.appendChild(displaySpan);
  }
  displaySpan.textContent = formattedDate;
}
// Dark Mode Toggle
    // Dark mode toggle for mobile menu
    document.getElementById('darkModeToggleMobile').addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
      document.getElementById('darkModeIcon').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
      document.getElementById('darkModeIconMobile').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
    });

    // Keep dark mode icons in sync
    document.addEventListener('DOMContentLoaded', () => {
      const isDark = document.documentElement.classList.contains('dark');
      document.getElementById('darkModeIcon').textContent = isDark ? '☀️' : '🌙';
      document.getElementById('darkModeIconMobile').textContent = isDark ? '☀️' : '🌙';
    });


function updateDarkModeIcon() {
    const icon = document.getElementById('darkModeIcon');
    if (icon) {
        icon.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
    }
}

// Apply dark mode classes to dynamic content
function applyDarkModeClasses() {
    document.querySelectorAll('.content-wrapper').forEach(el => {
        el.classList.add('dark:bg-gray-800', 'dark:text-gray-100');
    });

    document.querySelectorAll('input, select').forEach(el => {
        el.classList.add('dark:bg-gray-700', 'dark:text-white', 'dark:border-gray-600');
    });

    document.querySelectorAll('.text-gray-600').forEach(el => {
        el.classList.add('dark:text-gray-300');
    });
}

// Call this after loading new content
document.addEventListener('DOMContentLoaded', applyDarkModeClasses);

function showLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loadingOverlay.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <span>Loading...</span>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

// Add export button to toolbar
function exportToCSV() {
    const headers = ['Name', 'Designation', 'Course', 'Year', 'Start Date', 'End Date', 'Status'];
    const csv = [
        headers.join(','),
        ...interns.map(intern => [
            intern.name,
            intern.designation,
            intern.course,
            intern.year,
            intern.start_date,
            intern.end_date,
            intern.status
        ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interns.csv';
    a.click();
}

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

function validateDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
        showToast('End date cannot be earlier than start date', 'error');
        return false;
    }
    return true;
}

// Add theme options
const themes = {
    blue: { primary: 'blue', secondary: 'indigo' },
    green: { primary: 'green', secondary: 'emerald' },
    purple: { primary: 'purple', secondary: 'violet' }
};

function setTheme(themeName) {
    const theme = themes[themeName];
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    localStorage.setItem('theme', themeName);
}

// Add this function to initialize statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/interns/stats');
        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }
        const stats = await response.json();
        
        // Update the statistics display
        document.getElementById('totalInterns').textContent = stats.total || 0;
        document.getElementById('activeInterns').textContent = stats.active || 0;
        document.getElementById('completedInterns').textContent = stats.completed || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Call this when page loads and after any changes to interns
document.addEventListener('DOMContentLoaded', loadDashboardStats);

// Call loadDashboardStats on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
  showSection('manage-interns');
});

// Add this to your dashboard's theme toggle handler
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}