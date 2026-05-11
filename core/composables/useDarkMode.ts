

export const useDarkMode = () => {
  const isDark = useState('dark_mode', () => false)

  function init(_defaultColorMode?: 'light' | 'dark' | 'system', _respectUserPref = true) {
    
  }

  function toggle() {
    
  }

  return { isDark, init, toggle }
}
