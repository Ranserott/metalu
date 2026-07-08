"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/modules/users/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import Link from "next/link";

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => (
      <div className="flex gap-1 flex-wrap">
        {row.original.roles.map((role) => (
          <Badge key={role.id} variant="secondary">
            {role.name}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "destructive"}>
        {row.original.isActive ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/users/${row.original.id}/edit`}>Editar</Link>}
        />
      </div>
    ),
  },
];

export function UserTable({ data }: { data: User[] }) {
  return <DataTable columns={columns} data={data} />;
}