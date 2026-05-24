import type { ApiError } from "@/lib/api-errors";

type HttpErrorAlertProps = {
  error: ApiError;
  className?: string;
};

export default function HttpErrorAlert({ error, className = "" }: HttpErrorAlertProps) {
  const isConflict = error.status === 409;
  const isExpired = error.status === 410;

  const styles = isConflict
    ? "bg-amber-50 border-amber-300 text-amber-900"
    : isExpired
      ? "bg-rose-50 border-rose-300 text-rose-900"
      : "bg-red-50 border-red-300 text-red-900";

  const iconColor = isConflict
    ? "text-amber-600"
    : isExpired
      ? "text-rose-600"
      : "text-red-600";

  return (
    <div
      role="alert"
      className={`border-2 px-4 py-3.5 rounded-xl flex items-start gap-3 animate-fade-in shadow-sm ${styles} ${className}`}
    >
      <svg
        className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div>
        <h4 className="font-bold text-sm">{error.title}</h4>
        <p className="text-sm font-medium mt-0.5">{error.message}</p>
        <p className="text-xs opacity-70 mt-1 font-mono">HTTP {error.status}</p>
      </div>
    </div>
  );
}
