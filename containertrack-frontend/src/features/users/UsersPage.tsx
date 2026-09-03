import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Send } from "lucide-react";
import { usersApi } from "../../api/usersApi";
import { Button } from "../../components/ui";
import { Pagination } from "../../components/shared/Pagination";
import { Spinner } from "../../components/shared/Spinner";
import { formatDate } from "../../utils/dateFormat";
import { UserFormModal } from "./UserFormModal";
import type { User, UserStatus } from "../../types/user";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrador", OPERATOR: "Operador", WAREHOUSE: "Bodega" };
const STATUS_STYLES: Record<UserStatus, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "Activo", bg: "#D5F5E3", text: "#006850" },
  INACTIVE: { label: "Inactivo", bg: "#FADBD8", text: "#C0392B" },
  PENDING_ACTIVATION: { label: "Pendiente de activación", bg: "#FEF9E7", text: "#B8981F" },
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", { page, size: PAGE_SIZE }],
    queryFn: () => usersApi.list({ page, size: PAGE_SIZE }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      usersApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("No se pudo actualizar el estado"),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => usersApi.resendActivation(id),
    onSuccess: () => toast.success("Invitación reenviada"),
    onError: () => toast.error("No se pudo reenviar la invitación"),
  });

  const openCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary">Usuarios</h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo Usuario
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sage/40 text-dark-brown">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Correo</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Creado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            )}
            {data?.content.map((user) => {
              const statusStyle = STATUS_STYLES[user.status];
              return (
                <tr key={user.id} className="border-t border-sage/50">
                  <td className="px-4 py-3 font-medium text-dark-brown">{user.fullName}</td>
                  <td className="px-4 py-3 text-dark-brown">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-dark-brown">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-brown">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openEdit(user)} className="text-primary hover:underline">
                        Editar
                      </button>
                      {user.status !== "PENDING_ACTIVATION" && (
                        <button
                          type="button"
                          onClick={() =>
                            statusMutation.mutate({
                              id: user.id,
                              status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                            })
                          }
                          className="text-primary hover:underline"
                        >
                          {user.status === "ACTIVE" ? "Desactivar" : "Activar"}
                        </button>
                      )}
                      {user.status === "PENDING_ACTIVATION" && (
                        <button
                          type="button"
                          onClick={() => resendMutation.mutate(user.id)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Send size={14} />
                          Reenviar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
      </div>

      <UserFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} user={editingUser} />
    </div>
  );
}
