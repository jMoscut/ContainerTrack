import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { Button } from "../../components/ui";
import { Spinner } from "../../components/shared/Spinner";
import { ShippingCompanyFormModal } from "./ShippingCompanyFormModal";
import type { ShippingCompany } from "../../types/shippingCompany";

export function ShippingCompaniesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: true }],
    queryFn: () => shippingCompaniesApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      shippingCompaniesApi.updateStatus(id, { isActive }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["shippingCompanies"] });
    },
    onError: () => toast.error("No se pudo actualizar el estado"),
  });

  const openCreate = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  };

  const openEdit = (company: ShippingCompany) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary">Navieras</h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nueva Naviera
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sage/40 text-dark-brown">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">País</th>
              <th className="px-4 py-3 font-semibold">Días libres</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
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
            {companies?.map((company) => (
              <tr key={company.id} className="border-t border-sage/50">
                <td className="px-4 py-3 font-medium text-dark-brown">{company.name}</td>
                <td className="px-4 py-3 text-dark-brown">{company.shortCode}</td>
                <td className="px-4 py-3 text-dark-brown">{company.country}</td>
                <td className="px-4 py-3 text-dark-brown">{company.freeDaysLimit}</td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={
                      company.isActive
                        ? { backgroundColor: "#D5F5E3", color: "#006850" }
                        : { backgroundColor: "#FADBD8", color: "#C0392B" }
                    }
                  >
                    {company.isActive ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(company)} className="text-primary hover:underline">
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        statusMutation.mutate({ id: company.id, isActive: !company.isActive })
                      }
                      className="text-primary hover:underline"
                    >
                      {company.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShippingCompanyFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} company={editingCompany} />
    </div>
  );
}
