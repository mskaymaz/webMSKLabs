import React, { createContext, useContext, useState, useEffect } from 'react';

type Direction = 'ltr' | 'rtl';

interface I18nContextType {
  dir: Direction;
  toggleDir: () => void;
}

const I18nContext = createContext<I18nContextType>({
  dir: 'ltr',
  toggleDir: () => {}
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dir, setDir] = useState<Direction>(() => {
    return (localStorage.getItem('admin_dir') as Direction) || 'ltr';
  });

  const toggleDir = () => {
    setDir((prev) => (prev === 'ltr' ? 'rtl' : 'ltr'));
  };

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    localStorage.setItem('admin_dir', dir);
  }, [dir]);

  return (
    <I18nContext.Provider value={{ dir, toggleDir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
