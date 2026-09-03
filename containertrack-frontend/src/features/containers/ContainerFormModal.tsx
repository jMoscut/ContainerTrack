import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, Select, Textarea } from "../../components/ui";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { usersApi } from "../../api/usersApi";
import { portsApi } from "../../api/portsApi";
import { containersApi } from "../../api/containersApi";
import { CONTAINER_NUMBER_EXAMPLE, CONTAINER_NUMBER_REGEX } from "../../utils/containerValidator";
import { toIsoDate } from "../../utils/dateFormat";
import type { ApiError } from "../../types/auth";

const schema = z.object({
  containerNumber: z
    .string()
    .toUpperCase()
    .regex(CONTAINER_NUMBER_REGEX, `Formato inválido. Ejemplo: ${CONTAINER_NUMBER_EXAMPLE}`),
  shippingCompanyId: z.string().min(1, "Selecciona una naviera"),
  originPort: z.string().min(1, "Requerido"),
  destinationPort: z.string().min(1, "Requerido"),
  cargoDescription: z.string().max(500, "Máximo 500 caracteres"),
  responsibleOperatorId: z.string().min(1, "Selecciona un operador"),
  estimatedDepartureDate: z
    .string()
    .min(1, "Requerido")
    .refine((v) => v >= toIsoDate(new Date()), "No se permiten fechas pasadas"),
  internalNotes: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

interface ContainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContainerFormModal({ isOpen, onClose }: ContainerFormModalProps) {
  const queryClient = useQueryClient();

  const { data: companies } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: false }],
    queryFn: () => shippingCompaniesApi.list(false),
    enabled: isOpen,
  });

  const { data: operators } = useQuery({
    queryKey: ["users", { forOperatorSelect: true }],
    queryFn: () => usersApi.listActive(),
    enabled: isOpen,
  });

  const { data: ports } = useQuery({
    queryKey: ["ports", { includeInactive: false }],
    queryFn: () => portsApi.list(false),
    enabled: isOpen,
  });

  const destinationPorts = ports?.filter((p) => p.isGuatemalan);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange" });

  const containerNumber = watch("containerNumber") ?? "";

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      containersApi.create({
        ...values,
        internalNotes: values.internalNotes ?? "",
      }),
    onSuccess: () => {
      toast.success("Contenedor creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      reset();
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response?.data.error === "DUPLICATE_CONTAINER") {
        setError("containerNumber", { message: err.response.data.message });
      } else {
        toast.error("No se pudo crear el contenedor");
      }
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Contenedor" size="lg">
      <form
        id="container-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Input
          id="containerNumber"
          label="Número de contenedor"
          placeholder={CONTAINER_NUMBER_EXAMPLE}
          hint={
            containerNumber && !CONTAINER_NUMBER_REGEX.test(containerNumber.toUpperCase())
              ? undefined
              : `Formato: 4 letras + 6 dígitos + 1 dígito verificador. Ej: ${CONTAINER_NUMBER_EXAMPLE}`
          }
          error={errors.containerNumber?.message}
          {...register("containerNumber")}
        />
        <Select label="Naviera" error={errors.shippingCompanyId?.message} {...register("shippingCompanyId")}>
          <option value="">Selecciona...</option>
          {companies?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select id="originPort" label="Puerto de origen" error={errors.originPort?.message} {...register("originPort")}>
          <option value="">Selecciona...</option>
          {ports?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          id="destinationPort"
          label="Puerto de destino"
          error={errors.destinationPort?.message}
          {...register("destinationPort")}
        >
          <option value="">Selecciona...</option>
          {destinationPorts?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          label="Operador responsable"
          error={errors.responsibleOperatorId?.message}
          {...register("responsibleOperatorId")}
        >
          <option value="">Selecciona...</option>
          {operators?.map((op) => (
            <option key={op.id} value={op.id}>
              {op.fullName} ({op.role})
            </option>
          ))}
        </Select>
        <Input
          id="estimatedDepartureDate"
          type="date"
          label="Fecha estimada de salida"
          min={toIsoDate(new Date())}
          error={errors.estimatedDepartureDate?.message}
          {...register("estimatedDepartureDate")}
        />
        <Textarea
          id="cargoDescription"
          label="Descripción de la carga"
          rows={3}
          maxLength={500}
          className="sm:col-span-2"
          error={errors.cargoDescription?.message}
          {...register("cargoDescription")}
        />
        <Textarea
          id="internalNotes"
          label="Notas internas"
          rows={3}
          maxLength={1000}
          className="sm:col-span-2"
          error={errors.internalNotes?.message}
          {...register("internalNotes")}
        />
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={handleClose}>
          Cancelar
        </Button>
        <Button type="submit" form="container-form" isLoading={isSubmitting || mutation.isPending}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
