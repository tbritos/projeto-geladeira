import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export const useThemeApplier = () => {
  const { theme } = useAppContext();

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);
};
