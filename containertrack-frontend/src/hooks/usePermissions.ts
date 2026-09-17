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

/** Minimal shape of a container needed to decide edit/transition eligibility. */
interface AssignableContainer {
  status: ContainerStatus;
  responsibleOperatorId: string;
  warehouseAssigneeId?: string | null;
}

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role;
    // IDs come back from the backend as JSON numbers despite being typed `string`
    // in our TS interfaces — always compare through String(...) on both sides.
    const userId = user?.id != null ? String(user.id) : null;

    const isRole = (r: Role) => role === r;

    const canManageUsers = role === "ADMIN";
    const canManageShippingCompanies = role === "ADMIN";
    const canManagePorts = role === "ADMIN";
    const canManageLandCarriers = role === "ADMIN";
    const canCreateContainer = role === "ADMIN" || role === "OPERATOR";

    const isAssigned = (container: AssignableContainer): boolean => {
      if (role === "ADMIN") return true;
      if (role === "OPERATOR") return String(container.responsibleOperatorId) === userId;
      if (role === "WAREHOUSE") {
        return container.warehouseAssigneeId != null && String(container.warehouseAssigneeId) === userId;
      }
      return false;
    };

    // Editing is gated on TWO things: (1) being the specific person assigned to this
    // container (not just holding the right role — someone else's container isn't
    // yours to touch), and (2) WAREHOUSE additionally can't edit until the container
    // has left port, since before that it isn't their responsibility yet.
    const canEditContainer = (container: AssignableContainer): boolean => {
      if (!isAssigned(container)) return false;
      if (role === "WAREHOUSE") {
        const idx = CONTAINER_STATUS_ORDER.indexOf(container.status);
        const departedPortIdx = CONTAINER_STATUS_ORDER.indexOf("DEPARTED_PORT");
        return idx >= departedPortIdx;
      }
      return true;
    };

    // "Transporte terrestre" is a narrower exception: assigned WAREHOUSE can set it
    // as soon as the container reaches port, ahead of their normal DEPARTED_PORT gate.
    const canEditLandCarrier = (container: AssignableContainer): boolean => {
      if (!isAssigned(container)) return false;
      if (role === "WAREHOUSE") {
        const idx = CONTAINER_STATUS_ORDER.indexOf(container.status);
        return idx >= CONTAINER_STATUS_ORDER.indexOf("ARRIVED_PORT");
      }
      return true;
    };

    // Assigning the warehouse responsible is an ADMIN/OPERATOR action, gated the same
    // way as editing: ADMIN always, OPERATOR only on their own assigned container.
    const canAssignWarehouse = (container: AssignableContainer): boolean => {
      if (role === "ADMIN") return true;
      if (role === "OPERATOR") return String(container.responsibleOperatorId) === userId;
      return false;
    };

    const canGenerateReports = role === "ADMIN" || role === "OPERATOR";

    // Discarding a photo (mark invalid + reason) is allowed for ADMIN always, or the
    // specific WAREHOUSE user assigned to this container — mirrors backend authorization.
    const canInvalidatePhotos = (container: AssignableContainer): boolean => {
      if (role === "ADMIN") return true;
      if (role === "WAREHOUSE") {
        return container.warehouseAssigneeId != null && String(container.warehouseAssigneeId) === userId;
      }
      return false;
    };

    const canTransition = (container: AssignableContainer): boolean => {
      if (!role) return false;
      if (!isAssigned(container)) return false;
      const isLast = CONTAINER_STATUS_ORDER[CONTAINER_STATUS_ORDER.length - 1] === container.status;
      if (isLast) return false;
      return TRANSITION_ROLES[container.status]?.includes(role) ?? false;
    };

    // Every role now sees containers in every state, for full-lifecycle visibility —
    // WAREHOUSE just can't edit/transition until the container has left port (or isn't
    // the one assigned to it).
    const visibleStatuses = (): ContainerStatus[] => CONTAINER_STATUS_ORDER;

    return {
      role,
      isRole,
      canManageUsers,
      canManageShippingCompanies,
      canManagePorts,
      canManageLandCarriers,
      canCreateContainer,
      canEditContainer,
      canEditLandCarrier,
      canAssignWarehouse,
      canGenerateReports,
      canInvalidatePhotos,
      canTransition,
      visibleStatuses,
    };
  }, [user]);
}
