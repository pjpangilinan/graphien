import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard/Dashboard';
import Journal from './pages/Journal/Journal';
import SymbolStudio from './pages/SymbolStudio/SymbolStudio';
import Settings from './pages/Settings/Settings';
import NotFound from './pages/NotFound/NotFound';
import ToastContainer from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { useStore } from './store';

function App() {
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const [themeAnim, setThemeAnim] = React.useState(false);

  const handleToggle = () => {
    setThemeAnim(true);
    setTimeout(() => setThemeAnim(false), 400);
    toggleDarkMode();
  };

  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 sm:px-4 py-1.5 retro-border text-xs sm:text-sm text-center transition-colors cursor-pointer select-none ${
      isActive
        ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="flex flex-wrap items-center gap-3 p-4 sm:p-6 border-b-2 border-gray-300 dark:border-gray-700">
        <NavLink to="/" end className="flex items-center gap-2 sm:mr-6 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt="Graphien" className="h-8" />
          <span className="text-base sm:text-xl font-bold tracking-tight">Graphien</span>
        </NavLink>
        <button
          onClick={handleToggle}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`ml-auto order-1 sm:order-2 px-3 sm:px-4 py-1.5 retro-border bg-white dark:bg-gray-800 text-sm cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 ${themeAnim ? 'theme-toggle-animate' : ''}`}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <div className="order-2 sm:order-1 w-full sm:w-auto grid grid-cols-2 sm:flex gap-3">
          <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/symbols" className={(p) => `${linkClass(p)} sm:order-4`}>Symbols</NavLink>
          <NavLink to="/journal/new" className={(p) => `${linkClass(p)} sm:order-3`}>New</NavLink>
          <NavLink to="/settings" className={(p) => `${linkClass(p)} sm:order-5`}>Settings</NavLink>
        </div>
      </nav>
      <main className="p-4 sm:p-6 max-w-4xl mx-auto">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/journal/:id" element={<Journal />} />
          <Route path="/symbols" element={<SymbolStudio />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <ToastContainer />
    </div>
  );
}

export default App;
