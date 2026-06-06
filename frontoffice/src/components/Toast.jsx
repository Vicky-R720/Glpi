/**
 * Toast — floating notification component
 */
export default function Toast({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : ''}`}
        >
          <span style={{ marginRight: 8 }}>
            {t.type === 'success' ? '✓' : '✕'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
