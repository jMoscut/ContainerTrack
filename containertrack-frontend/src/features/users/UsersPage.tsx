import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Plus, Send, Pencil, Power, KeyRound, Users as UsersIcon } from "lucide-react";
import { usersApi } from "../../api/usersApi";
import { Button } from "../../components/ui";
import { Pagination } from "../../components/shared/Pagination";
import { Spinner } from "../../components/shared/Spinner";
import { StatusPill } from "../../components/shared/StatusPill";
import { MobileRowCard } from "../../components/shared/MobileRowCard";
import { EmptyState } from "../../components/shared/EmptyState";
import { formatDate } from "../../utils/dateFormat";
import { UserFormModal } from "./UserFormModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import type { User, UserStatus } from "../../types/user";

const PAGE_SIZE = 20;

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  const STATUS_TONE: Record<UserStatus, { label: string; tone: "success" | "danger" | "warning" }> = {
    ACTIVE: { label: t("users.statusActive"), tone: "success" },
    INACTIVE: { label: t("users.statusInactive"), tone: "danger" },
    PENDING_ACTIVATION: { label: t("users.statusPending"), tone: "warning" },
  };

  const { data, isLoading } = useQuery({
    queryKey: ["users", { page, size: PAGE_SIZE }],
    queryFn: () => usersApi.list({ page, size: PAGE_SIZE }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      usersApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success(t("users.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error(t("users.statusUpdateError")),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => usersApi.resendActivation(id),
    onSuccess: () => toast.success(t("users.invitationResent")),
    onError: () => toast.error(t("users.invitationResendError")),
  });

  const openCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const openResetPassword = (user: User) => {
    setResettingUser(user);
    setIsResetOpen(true);
  };

  const isEmpty = !isLoading && data?.content.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">{t("users.title")}</h1>
          <p className="text-sm text-gray-500">{t("users.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          {t("users.new")}
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center rounded-lg bg-white py-12 shadow-card">
          <Spinner />
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg bg-white shadow-card">
          <EmptyState
            icon={<UsersIcon size={26} />}
            title={t("users.empty")}
            description={t("users.emptyDescription")}
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                {t("users.new")}
              </Button>
            }
          />
        </div>
      )}

      {!isLoading && !isEmpty && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-lg bg-white shadow-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-sage/40 text-dark-brown">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("users.name")}</th>
                  <th className="px-4 py-3 font-semibold">{t("users.email")}</th>
                  <th className="px-4 py-3 font-semibold">{t("users.role")}</th>
                  <th className="px-4 py-3 font-semibold">{t("users.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("users.created")}</th>
                  <th className="px-4 py-3 font-semibold">{t("users.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data?.content.map((user) => {
                  const statusInfo = STATUS_TONE[user.status];
                  return (
                    <tr key={user.id} className="border-t border-sage/50 transition-colors hover:bg-sage/10">
                      <td className="px-4 py-3 font-medium text-dark-brown">{user.fullName}</td>
                      <td className="px-4 py-3 text-dark-brown">{user.email}</td>
                      <td className="px-4 py-3">
                        <StatusPill label={t(`roles.${user.role}`, { defaultValue: user.role })} tone="primary" variant="outline" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
                      </td>
                      <td className="px-4 py-3 text-dark-brown">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            aria-label={t("users.edit")}
                            title={t("users.edit")}
                            className="rounded-full p-2 text-dark-brown/70 transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openResetPassword(user)}
                            aria-label={t("users.resetPassword")}
                            title={t("users.resetPassword")}
                            className="rounded-full p-2 text-dark-brown/70 transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <KeyRound size={18} />
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
                              aria-label={user.status === "ACTIVE" ? t("users.deactivate") : t("users.activate")}
                              title={user.status === "ACTIVE" ? t("users.deactivate") : t("users.activate")}
                              className={`rounded-full p-2 transition-colors ${
                                user.status === "ACTIVE"
                                  ? "text-dark-brown/70 hover:bg-[#FADBD8] hover:text-[#C0392B]"
                                  : "text-dark-brown/70 hover:bg-primary/10 hover:text-primary"
                              }`}
                            >
                              <Power size={18} />
                            </button>
                          )}
                          {user.status === "PENDING_ACTIVATION" && (
                            <button
                              type="button"
                              onClick={() => resendMutation.mutate(user.id)}
                              aria-label={t("users.resendActivation")}
                              title={t("users.resendActivation")}
                              className="rounded-full p-2 text-dark-brown/70 transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <Send size={18} />
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

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {data?.content.map((user) => {
              const statusInfo = STATUS_TONE[user.status];
              return (
                <MobileRowCard
                  key={user.id}
                  title={user.fullName}
                  subtitle={user.email}
                  badges={
                    <>
                      <StatusPill label={t(`roles.${user.role}`, { defaultValue: user.role })} tone="primary" variant="outline" />
                      <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
                    </>
                  }
                  rows={[{ label: t("users.created"), value: formatDate(user.createdAt) }]}
                  actions={
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        aria-label={t("users.edit")}
                        title={t("users.edit")}
                        className="rounded-full p-2 text-dark-brown/70 transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openResetPassword(user)}
                        aria-label={t("users.resetPassword")}
                        title={t("users.resetPassword")}
                        className="rounded-full p-2 text-dark-brown/70 transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <KeyRound size={18} />
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
                          aria-label={user.status === "ACTIVE" ? t("users.deactivate") : t("users.activate")}
                          title={user.status === "ACTIVE" ? t("users.deactivate") : t("users.activate")}
                          className={`rounded-full p-2 transition-colors ${
                            user.status === "ACTIVE"
                              ? "text-dark-brown/70 hover:bg-[#FADBD8] hover:text-[#C0392B]"
                              : "text-dark-brown/70 hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          <Power size={18} />
                        </button>
                      )}
                      {user.status === "PENDING_ACTIVATION" && (
                        <button
                          type="button"
                          onClick={() => resendMutation.mutate(user.id)}
                          aria-label={t("users.resendActivation")}
                          title={t("users.resendActivation")}
                          className="rounded-full p-2 text-dark-brown/70 transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <Send size={18} />
                        </button>
                      )}
                    </div>
                  }
                />
              );
            })}
            {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
          </div>
        </>
      )}

      <UserFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} user={editingUser} />
      <ResetPasswordModal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} user={resettingUser} />
    </div>
  );
}
