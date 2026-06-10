import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <div className="text-8xl font-bold tracking-tight text-gray-300 dark:text-gray-700 select-none">
        404
      </div>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 retro-border bg-white dark:bg-gray-800 text-sm cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Go back
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 text-sm cursor-pointer select-none hover:bg-gray-700 dark:hover:bg-gray-300"
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}

export default NotFound;
