import { getRoles } from "@/modules/roles/services/roleService";
import NewUserForm from "./NewUserForm";

export default async function NewUserPage() {
  const roles = await getRoles();
  return <NewUserForm roles={roles} />;
}