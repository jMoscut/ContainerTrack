import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { UploadCloud, Eye, ImageOff, Trash2, X } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/shared/Spinner";
import { containersApi } from "../../api/containersApi";
import { formatDateTime } from "../../utils/dateFormat";

const MAX_FILES = 20;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_PREFIX = "image/";

interface PendingFile {
  file: File;
  previewUrl: string;
}

interface PhotoPanelProps {
  containerId: string;
  readOnly: boolean;
  canInvalidate: boolean;
  onPhotoCountChange?: (count: number) => void;
}

export function PhotoPanel({ containerId, readOnly, canInvalidate, onPhotoCountChange }: PhotoPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["containerPhotos", containerId],
    queryFn: () => containersApi.listPhotos(containerId),
  });

  useEffect(() => {
    if (photos) onPhotoCountChange?.(photos.length);
  }, [photos, onPhotoCountChange]);

  // Revoke object URLs on unmount / when the pending selection changes to avoid leaks.
  useEffect(() => {
    return () => {
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [pendingFiles]);

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => containersApi.uploadPhotos(containerId, files),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["containerPhotos", containerId] });
      if (result.uploaded.length) {
        toast.success(t("photos.uploadSuccess", { count: result.uploaded.length }));
      }
      if (result.failed.length) {
        toast.error(
          t("photos.uploadFailed", {
            count: result.failed.length,
            names: result.failed.map((f) => f.filename).join(", "),
          }),
        );
      }
    },
    onError: () => toast.error(t("photos.uploadError")),
  });

  const removeMutation = useMutation({
    mutationFn: ({ photoId, reason }: { photoId: string; reason: string }) =>
      containersApi.removePhoto(containerId, photoId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containerPhotos", containerId] });
      toast.success(t("photos.deleteSuccess"));
    },
    onError: () => toast.error(t("photos.deleteError")),
  });

  const handleRemove = (photoId: string) => {
    const reason = window.prompt(t("photos.deleteReasonPrompt"));
    if (!reason || !reason.trim()) return;
    removeMutation.mutate({ photoId, reason: reason.trim() });
  };

  const handleFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setClientError(null);

    if (files.length > MAX_FILES) {
      setClientError(t("photos.maxFilesError", { max: MAX_FILES }));
      return;
    }
    const invalid = files.find((f) => !f.type.startsWith(ACCEPTED_MIME_PREFIX) || f.size > MAX_SIZE_BYTES);
    if (invalid) {
      setClientError(t("photos.invalidFileError", { name: invalid.name }));
      return;
    }

    setPendingFiles(files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (previewUrl: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.previewUrl === previewUrl);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.previewUrl !== previewUrl);
    });
  };

  const cancelPending = () => {
    pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingFiles([]);
  };

  const confirmUpload = () => {
    if (pendingFiles.length === 0) return;
    uploadMutation.mutate(
      pendingFiles.map((p) => p.file),
      { onSuccess: () => setPendingFiles([]) },
    );
  };

  return (
    <Card title={t("photos.title")}>
      <div className="flex flex-col gap-4">
        {!readOnly && pendingFiles.length === 0 && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sage bg-sage/10 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-sage/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadMutation.isPending ? (
                <Spinner />
              ) : (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UploadCloud size={22} />
                  </span>
                  <span className="text-sm font-semibold text-dark-brown">{t("photos.clickToUpload")}</span>
                  <span className="text-xs text-gray-500">{t("photos.formatHint", { max: MAX_FILES })}</span>
                </>
              )}
            </button>
            {clientError && <p className="mt-2 text-sm text-[#C0392B]">{clientError}</p>}
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg border border-sage bg-sage/10 p-3">
            <p className="text-sm font-semibold text-dark-brown">
              {t("photos.pendingReview", { count: pendingFiles.length })}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {pendingFiles.map((p) => (
                <div
                  key={p.previewUrl}
                  className="relative flex h-24 w-full overflow-hidden rounded-md border border-sage bg-white"
                >
                  <img src={p.previewUrl} alt={p.file.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePendingFile(p.previewUrl)}
                    disabled={uploadMutation.isPending}
                    aria-label={t("photos.removePending")}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#C0392B] shadow-subtle hover:bg-white disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={cancelPending} disabled={uploadMutation.isPending}>
                {t("photos.cancelPending")}
              </Button>
              <Button onClick={confirmUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? (
                  <Spinner />
                ) : (
                  t("photos.confirmUpload", { count: pendingFiles.length })
                )}
              </Button>
            </div>
          </div>
        )}

        {isLoading && <Spinner />}

        {photos && photos.length === 0 && pendingFiles.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-gray-500">
            <ImageOff size={22} className="text-gray-300" />
            <p className="text-sm">{t("photos.empty")}</p>
          </div>
        )}

        {photos && photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.photoId}
                className={`group relative flex flex-col overflow-hidden rounded-md border shadow-subtle transition-shadow hover:shadow-card ${
                  photo.isValid ? "border-sage" : "border-[#C0392B]/50 opacity-60"
                }`}
              >
                <a
                  href={photo.presignedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative h-24 w-full overflow-hidden bg-sage/20"
                >
                  <img
                    src={photo.presignedUrl}
                    alt={photo.originalFilename}
                    className="h-24 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 hidden items-center justify-center bg-dark-brown/40 opacity-0 transition-all duration-150 group-hover:opacity-100 sm:flex">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary">
                      <Eye size={16} />
                    </span>
                  </div>
                  <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-primary shadow-subtle sm:hidden">
                    <Eye size={13} />
                  </span>
                </a>
                {canInvalidate && photo.isValid && (
                  <button
                    type="button"
                    onClick={() => handleRemove(photo.photoId)}
                    disabled={removeMutation.isPending}
                    aria-label={t("photos.invalidate")}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#C0392B] shadow-subtle hover:bg-white disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <div className="px-2 py-1 text-[11px] text-gray-500">
                  <p className="truncate">{photo.uploadedByName ?? t("containerDetail.notAvailable")}</p>
                  <p>{formatDateTime(photo.uploadedAt)}</p>
                  {!photo.isValid && (
                    <p className="font-semibold text-[#C0392B]">{t("photos.invalidatedBadge")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
