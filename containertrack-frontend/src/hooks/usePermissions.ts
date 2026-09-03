import { useMemo } from "react";
import { useAuth } from "../store/AuthContext";
import type { Role } from "../types/auth";
import type { ContainerStatus } from "../types/container";
import { CONTAINER_STATUS_ORDER } from "../types/container";

/** Maps each status to the role(s) allowed to perform the transition OUT of it. */
const TRANSITION_ROLES: Record<ContainerStatus, Role[]> = {
  REGISTERED: ["ADMIN", "OPERATOR"],
  DEPARTED_ORIGIN: ["ADMIN", "OPERATOR"],
  ARRIVED_PORT: ["ADMIN", "OPERATOR"],
  DEPARTED_PORT: ["ADMIN", "OPERATOR"],
  ARRIVED_WAREHOUSE: ["ADMIN", "WAREHOUSE"],
  DISCHARGED: [],
};

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role;

    const isRole = (r: Role) => role === r;

    const canManageUsers = role === "ADMIN";
    const canManageShippingCompanies = role === "ADMIN";
    const canManagePorts = role === "ADMIN";
    const canCreateContainer = role === "ADMIN" || role === "OPERATOR";
    const canEditContainer = role === "ADMIN" || role === "OPERATOR";
    const canGenerateReports = role === "ADMIN" || role === "OPERATOR";

    const canTransition = (status: ContainerStatus): boolean => {
      if (!role) return false;
      const isLast = CONTAINER_STATUS_ORDER[CONTAINER_STATUS_ORDER.length - 1] === status;
      if (isLast) return false;
      return TRANSITION_ROLES[status]?.includes(role) ?? false;
    };

    const visibleStatuses = (): ContainerStatus[] => {
      if (role === "WAREHOUSE") return ["ARRIVED_WAREHOUSE", "DISCHARGED"];
      return CONTAINER_STATUS_ORDER;
    };

    return {
      role,
      isRole,
      canManageUsers,
      canManageShippingCompanies,
      canManagePorts,
      canCreateContainer,
      canEditContainer,
      canGenerateReports,
      canTransition,
      visibleStatuses,
    };
  }, [user]);
}
