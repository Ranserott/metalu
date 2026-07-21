"use client";

import { useEffect, useState } from "react";

interface ServerInfo {
  ip: string;
  port: number;
  hostname: string;
  version: string;
  status: string;
  uptimeSeconds: number;
}

export default function ServerInfoPage() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/server-info")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setInfo)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!info) return <p>Cargando...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Server Info</h1>
      <dl className="grid grid-cols-[120px_1fr] gap-2">
        <dt className="font-semibold">IP LAN:</dt>
        <dd>{info.ip}</dd>
        <dt className="font-semibold">Puerto:</dt>
        <dd>{info.port}</dd>
        <dt className="font-semibold">Hostname:</dt>
        <dd>{info.hostname}</dd>
        <dt className="font-semibold">Versión:</dt>
        <dd>{info.version}</dd>
        <dt className="font-semibold">Status:</dt>
        <dd>{info.status}</dd>
        <dt className="font-semibold">Uptime:</dt>
        <dd>{Math.floor(info.uptimeSeconds / 60)} min</dd>
      </dl>
      <p className="mt-6 text-sm text-gray-600">
        Para conectar un cliente, doble click en <code>metalu-client.exe</code> en otra PC de la misma LAN.
      </p>
    </div>
  );
}
