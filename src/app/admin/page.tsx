export default function AdminPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <a href="/admin/server-info" className="text-blue-600 hover:underline">
            Ver info del servidor
          </a>
        </li>
        <li>
          <a href="/admin/backups" className="text-blue-600 hover:underline">
            Backups y restore
          </a>
        </li>
      </ul>
    </div>
  );
}
