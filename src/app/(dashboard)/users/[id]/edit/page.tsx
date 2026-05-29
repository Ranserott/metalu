import { getUserById } from "@/modules/users/services/userService";
import { getRoles } from "@/modules/roles/services/roleService";
import { notFound } from "next/navigation";
import EditUserForm from "./EditUserForm";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  const [user, roles] = await Promise.all([getUserById(id), getRoles()]);

  if (!user) {
    notFound();
  }

  return <EditUserForm user={user} roles={roles} userId={user.id} />;
}