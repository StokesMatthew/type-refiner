export let isDarkMode = true;

export const themes = {
    light: {
        '--primary': '#2563eb',
        '--primary-light': '#3b82f6',
        '--primary-dark': '#1d4ed8',
        '--secondary': '#64748b',
        '--success': '#22c55e',
        '--success-dark': '#16a34a',
        '--danger': '#ee3333',
        '--danger-dark': '#dc2626',
        '--background': '#f8fafc',
        '--surface': '#ffffff',
        '--surface-dark': '#f0f0f0',
        '--text': '#161e2b',
        '--text-light': '#64748b',
        '--text-dark': '#0056b3',
        '--border': '#e2e8f0',
        '--shadow': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        '--radius': '0.5rem',
    },
    dark: {
        '--primary': '#2563eb',
        '--primary-light': '#3b82f6',
        '--primary-dark': '#1d4ed8',
        '--secondary': '#64748b',
        '--success': '#22c55e',
        '--success-dark': '#16a34a',
        '--danger': '#ee3333',
        '--danger-dark': '#dc2626',
        '--background': '#1a202c',
        '--surface': '#2d3748',
        '--surface-dark': '#1e293b',
        '--text': '#f8fafc',
        '--text-light': '#cbd5e1',
        '--text-dark': '#f8fafc',
        '--border': '#334155',
        '--shadow': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        '--radius': '0.5rem',
    },
        
}

export const applyTheme = () => {
  const theme = isDarkMode ? themes.dark : themes.light;
  
  Object.entries(theme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value as string);
  });
};

export const toggleTheme = () => {
  isDarkMode = !isDarkMode;
  applyTheme();
  return isDarkMode;
};

export const getCurrentTheme = () => {
  return isDarkMode;
}; 