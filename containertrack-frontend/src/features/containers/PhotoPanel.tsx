import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui";
import { Spinner } from "../../components/shared/Spinner";
import { containersApi } from "../../api/containersApi";
import { formatDateTime } from "../../utils/dateFormat";

const MAX_FILES = 20;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_PREFIX = "image/";

interface PhotoPanelProps {
  containerId: string;
  readOnly: boolean;
  onPhotoCountChange?: (count: number) => void;
}

export function PhotoPanel({ containerId, readOnly, onPhotoCountChange }: PhotoPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["containerPhotos", containerId],
    queryFn: () => containersApi.listPhotos(containerId),
  });

  useEffect(() => {
    if (photos) onPhotoCountChange?.(photos.length);
  }, [photos, onPhotoCountChange]);

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => containersApi.uploadPhotos(containerId, files),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["containerPhotos", containerId] });
      if (result.uploaded.length) {
        toast.success(`${result.uploaded.length} foto(s) subida(s) correctamente`);
      }
      if (result.failed.length) {
        toast.error(`${result.failed.length} foto(s) fallaron: ${result.failed.map((f) => f.filename).join(", ")}`);
      }
    },
    onError: () => toast.error("No se pudieron subir las fotos"),
  });

  const handleFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setClientError(null);

    if (files.length > MAX_FILES) {
      setClientError(`Puedes subir un máximo de ${MAX_FILES} archivos a la vez.`);
      return;
    }
    const invalid = files.find((f) => !f.type.startsWith(ACCEPTED_MIME_PREFIX) || f.size > MAX_SIZE_BYTES);
    if (invalid) {
      setClientError(
        `El archivo "${invalid.name}" no es válido. Solo se permiten imágenes de hasta 10MB.`,
      );
      return;
    }

    uploadMutation.mutate(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card title="Evidencia fotográfica">
      <div className="flex flex-col gap-4">
        {!readOnly && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              isLoading={uploadMutation.isPending}
            >
              <Upload size={16} />
              Subir fotos
            </Button>
            {clientError && <p className="mt-2 text-sm text-[#C0392B]">{clientError}</p>}
          </div>
        )}

        {isLoading && <Spinner />}

        {photos && photos.length === 0 && (
          <p className="text-sm text-gray-500">Aún no se han subido fotos para este contenedor.</p>
        )}

        {photos && photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <a
                key={photo.photoId}
                href={photo.presignedUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col overflow-hidden rounded-md border border-sage"
              >
                <img
                  src={photo.presignedUrl}
                  alt={photo.originalFilename}
                  className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="px-2 py-1 text-[11px] text-gray-500">
                  <p className="truncate">{photo.uploadedBy.fullName}</p>
                  <p>{formatDateTime(photo.uploadedAt)}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
