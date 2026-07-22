"use client";

import { useEffect, useRef, useState } from "react";

interface Backup {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const r = await fetch("/api/backup");
    const j = await r.json();
    setBackups(j.backups ?? []);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleExport = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/backup", { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "export failed");
      setMsg(`Backup creado: ${j.filename}`);
      await refresh();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = (filename: string) => {
    window.location.href = `/api/backup/${filename}`;
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`¿Borrar ${filename}?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/backup/${filename}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    if (!confirm(`¿Restaurar DB desde ${file.name}? Esto reemplaza la DB actual.`)) return;
    setBusy(true);
    setMsg("Restaurando...");
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch("/api/backup/restore", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "restore failed");
      setMsg(`Restore OK desde ${j.restoredFrom}`);
      await refresh();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Backups</h1>

      <div className="mb-6 flex gap-3">
        <button
          onClick={handleExport}
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Hacer backup ahora
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".pglitebackup"
          className="text-sm"
        />
        <button
          onClick={handleRestore}
          disabled={busy}
          className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Restaurar desde archivo
        </button>
      </div>

      {msg && <p className="mb-4 text-sm">{msg}</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Archivo</th>
            <th className="text-right p-2">Tamaño</th>
            <th className="text-left p-2">Fecha</th>
            <th className="text-right p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {backups.map((b) => (
            <tr key={b.filename} className="border-b">
              <td className="p-2 font-mono">{b.filename}</td>
              <td className="p-2 text-right">
                {(b.sizeBytes / 1024 / 1024).toFixed(2)} MB
              </td>
              <td className="p-2">{new Date(b.createdAt).toLocaleString()}</td>
              <td className="p-2 text-right">
                <button
                  onClick={() => handleDownload(b.filename)}
                  className="text-blue-600 hover:underline mr-3"
                >
                  Descargar
                </button>
                <button
                  onClick={() => handleDelete(b.filename)}
                  className="text-red-600 hover:underline"
                >
                  Borrar
                </button>
              </td>
            </tr>
          ))}
          {backups.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">
                Sin backups todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}