// Initialize settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  applySettings();
});

function setupEventListeners() {
  // Dark Mode Toggle
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', toggleDarkMode);
  }

  // Font Size Slider
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', handleFontSizeChange);
  }

  // Theme Color Radio Buttons
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.addEventListener('change', handleThemeChange);
  });

  // Reset Settings Button
  const resetButton = document.getElementById('resetSettings');
  if (resetButton) {
    resetButton.addEventListener('click', resetAllSettings);
  }
}

function loadSettings() {
  // Load dark mode setting
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.checked = isDarkMode;
  }

  // Load font size setting
  const fontSize = localStorage.getItem('fontSize') || '100';
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  if (fontSizeSlider) {
    fontSizeSlider.value = fontSize;
    updateFontSizeLabel(fontSize);
  }

  // Load theme color setting
  const theme = localStorage.getItem('theme') || 'purple';
  const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
  if (themeRadio) {
    themeRadio.checked = true;
  }
}

function applySettings() {
  // Apply dark mode
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }

  // Apply font size
  const fontSize = localStorage.getItem('fontSize') || '100';
  document.documentElement.style.fontSize = (16 * parseInt(fontSize) / 100) + 'px';

  // Apply theme color (this would need custom CSS variables for themes)
  const theme = localStorage.getItem('theme') || 'purple';
  applyTheme(theme);
}

function toggleDarkMode(e) {
  const isDarkMode = e.target.checked;
  localStorage.setItem('darkMode', isDarkMode);
  document.documentElement.classList.toggle('dark-mode', isDarkMode);
  
  // Update label
  const darkModeLabel = document.getElementById('darkModeLabel');
  if (darkModeLabel) {
    darkModeLabel.textContent = isDarkMode ? 'On' : 'Off';
  }
}

function handleFontSizeChange(e) {
  const fontSize = e.target.value;
  localStorage.setItem('fontSize', fontSize);
  document.documentElement.style.fontSize = (16 * parseInt(fontSize) / 100) + 'px';
  updateFontSizeLabel(fontSize);
}

function updateFontSizeLabel(fontSize) {
  const fontSizeValue = document.getElementById('fontSizeValue');
  if (fontSizeValue) {
    fontSizeValue.textContent = fontSize + '%';
  }
}

function handleThemeChange(e) {
  const theme = e.target.value;
  localStorage.setItem('theme', theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  // Remove all theme classes
  document.documentElement.classList.remove('theme-blue', 'theme-green', 'theme-orange', 'theme-purple');
  
  // Add selected theme class (skip if purple as it's default)
  if (theme !== 'purple') {
    document.documentElement.classList.add('theme-' + theme);
  }
}

function resetAllSettings() {
  // Confirm before resetting
  if (confirm('Are you sure you want to reset all settings to default?')) {
    // Clear localStorage
    localStorage.removeItem('darkMode');
    localStorage.removeItem('fontSize');
    localStorage.removeItem('theme');

    // Reset UI
    loadSettings();
    applySettings();

    // Reload page to show changes
    location.reload();
  }
}

// Apply settings on every page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applySettings);
} else {
  applySettings();
}

// Also watch for changes in other tabs/windows
window.addEventListener('storage', (e) => {
  if (e.key === 'darkMode' || e.key === 'fontSize' || e.key === 'theme') {
    applySettings();
    loadSettings();
  }
});
