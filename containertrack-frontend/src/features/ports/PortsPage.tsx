import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { portsApi } from "../../api/portsApi";
import { Button } from "../../components/ui";
import { Spinner } from "../../components/shared/Spinner";
import { PortFormModal } from "./PortFormModal";
import type { Port } from "../../types/port";

export function PortsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);

  const { data: ports, isLoading } = useQuery({
    queryKey: ["ports", { includeInactive: true }],
    queryFn: () => portsApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => portsApi.updateStatus(id, { isActive }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["ports"] });
    },
    onError: () => toast.error("No se pudo actualizar el estado"),
  });

  const openCreate = () => {
    setEditingPort(null);
    setIsFormOpen(true);
  };

  const openEdit = (port: Port) => {
    setEditingPort(port);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary">Puertos</h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo Puerto
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sage/40 text-dark-brown">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">País</th>
              <th className="px-4 py-3 font-semibold">Guatemalteco</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            )}
            {ports?.map((port) => (
              <tr key={port.id} className="border-t border-sage/50">
                <td className="px-4 py-3 font-medium text-dark-brown">{port.name}</td>
                <td className="px-4 py-3 text-dark-brown">{port.country}</td>
                <td className="px-4 py-3">
                  {port.isGuatemalan && (
                    <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-dark-brown">
                      Guatemalteco
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={
                      port.isActive
                        ? { backgroundColor: "#D5F5E3", color: "#006850" }
                        : { backgroundColor: "#FADBD8", color: "#C0392B" }
                    }
                  >
                    {port.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(port)} className="text-primary hover:underline">
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: port.id, isActive: !port.isActive })}
                      className="text-primary hover:underline"
                    >
                      {port.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PortFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} port={editingPort} />
    </div>
  );
}
