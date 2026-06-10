import { useToastStore } from '../store/toast';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 space-y-3 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-5 py-3 retro-border text-sm font-bold flex items-center gap-3 max-w-sm ${
            toast.type === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : toast.type === 'error'
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="font-bold text-lg leading-none cursor-pointer select-none hover:opacity-70"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
