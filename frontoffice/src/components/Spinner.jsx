/**
 * Spinner — GLPI-style loading indicator
 */
export default function Spinner({ text = 'Chargement des données...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="glpi-spinner" />
      <p className="text-sm" style={{ color: 'var(--glpi-gray-500)' }}>
        {text}
      </p>
    </div>
  );
}
