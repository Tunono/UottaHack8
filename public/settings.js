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

  // Custom API Key
  const addApiKeyButton = document.getElementById('addApiKey');
  if (addApiKeyButton) {
    addApiKeyButton.addEventListener('click', addCustomApiKey);
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

  // Load custom API keys
  const customKeys = JSON.parse(localStorage.getItem('customApiKeys') || '[]');
  renderSavedKeys(customKeys);
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
    localStorage.removeItem('customApiKeys');

    // Reset UI
    loadSettings();
    applySettings();
    renderSavedKeys([]); // Clear the keys list

    // Reload page to show changes
    location.reload();
  }
}

function addCustomApiKey() {
  const provider = document.getElementById('customProvider').value;
  const apiKey = document.getElementById('customApiKey').value.trim();
  
  if (!provider) {
    showNotification('Please select a provider.', 'danger');
    return;
  }
  if (!apiKey) {
    showNotification('Please enter an API key.', 'danger');
    return;
  }
  
  // Basic validation for API key format
  if (!isValidApiKey(provider, apiKey)) {
    showNotification('Invalid API key format for the selected provider.', 'danger');
    return;
  }
  
  const customKeys = JSON.parse(localStorage.getItem('customApiKeys') || '[]');
  
  // Check if key already exists
  const existingKey = customKeys.find(k => k.key === apiKey);
  if (existingKey) {
    showNotification('This API key is already saved.', 'warning');
    return;
  }
  
  // Add new key
  customKeys.push({ provider, key: apiKey });
  localStorage.setItem('customApiKeys', JSON.stringify(customKeys));
  
  // Clear form
  document.getElementById('customProvider').value = '';
  document.getElementById('customApiKey').value = '';
  
  // Re-render list
  renderSavedKeys(customKeys);
  showNotification('<i class="fas fa-check-circle"></i> API key added successfully!', 'success');
}

function isValidApiKey(provider, apiKey) {
  switch (provider) {
    case 'openai':
      // OpenAI keys typically start with 'sk-' and are longer than 20 characters
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'gemini':
      // Gemini API keys are typically 39 characters long
      return apiKey.length === 39;
    case 'anthropic':
      // Anthropic keys typically start with 'sk-ant-'
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    case 'custom':
      // For custom, just check it's not empty and has reasonable length
      return apiKey.length > 10;
    default:
      return true; // Allow if provider is unknown
  }
}

function renderSavedKeys(keys) {
  const listContainer = document.getElementById('savedKeysList');
  listContainer.innerHTML = '';
  
  if (keys.length === 0) {
    listContainer.innerHTML = '<p class="text-muted">No custom API keys saved yet.</p>';
    return;
  }
  
  keys.forEach((keyObj, index) => {
    const keyItem = document.createElement('div');
    keyItem.className = 'saved-key-item mb-2 p-2 border rounded';
    keyItem.innerHTML = `
      <div class="mb-1 text-center">
        <strong style="font-size: 0.9rem;">${keyObj.provider.charAt(0).toUpperCase() + keyObj.provider.slice(1)} API Key</strong>
      </div>
      <div class="text-center">
        <button class="btn btn-link text-muted" style="font-size: 0.75rem; padding: 0.1rem 0.3rem;" onclick="removeApiKey(${index})">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
    `;
    listContainer.appendChild(keyItem);
  });
}

function removeApiKey(index) {
  const customKeys = JSON.parse(localStorage.getItem('customApiKeys') || '[]');
  customKeys.splice(index, 1);
  localStorage.setItem('customApiKeys', JSON.stringify(customKeys));
  renderSavedKeys(customKeys);
  showNotification('API key removed.', 'info');
}

// Make removeApiKey available globally
window.removeApiKey = removeApiKey;

function showNotification(message, type = 'success') {
  const banner = document.getElementById('notificationBanner');
  const messageSpan = document.getElementById('notificationMessage');
  
  if (banner && messageSpan) {
    // Remove existing classes
    banner.classList.remove('alert-success', 'alert-danger', 'alert-info', 'alert-warning');
    // Add new type class
    banner.classList.add('alert-' + type);
    
    messageSpan.innerHTML = message;
    banner.style.display = 'block';
    banner.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      banner.classList.remove('show');
      setTimeout(() => {
        banner.style.display = 'none';
      }, 150); // Wait for fade out
    }, 5000);
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
