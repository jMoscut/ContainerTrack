package com.containertrack.service;

import com.containertrack.dto.response.PhotoDTO;
import com.containertrack.dto.response.PhotoUploadResultDTO;
import com.containertrack.entity.AuditAction;
import com.containertrack.entity.Container;
import com.containertrack.entity.ContainerPhoto;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.ForbiddenException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.repository.ContainerPhotoRepository;
import com.containertrack.repository.ContainerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContainerPhotoService {

    private static final Duration PRESIGN_TTL = Duration.ofHours(1);

    private final ContainerRepository containerRepository;
    private final ContainerPhotoRepository containerPhotoRepository;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    @Transactional
    public PhotoUploadResultDTO uploadPhotos(Long containerId, List<MultipartFile> files, Long uploadedBy) {
        Container container = findContainer(containerId);

        if (container.getStatus() != ContainerStatus.ARRIVED_WAREHOUSE) {
            throw new ForbiddenException("INVALID_CONTAINER_STATE",
                    "Solo se pueden subir fotos cuando el contenedor está en estado ARRIVED_WAREHOUSE.");
        }
        if (files == null || files.isEmpty() || files.size() > 20) {
            throw new BadRequestException("INVALID_FILE_COUNT", "Debe subir entre 1 y 20 archivos.");
        }

        List<PhotoDTO> uploaded = new ArrayList<>();
        List<String> failed = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                FileStorageService.UploadedFile result = fileStorageService.uploadFile(file, String.valueOf(containerId));
                ContainerPhoto photo = ContainerPhoto.builder()
                        .containerId(containerId)
                        .r2Key(result.r2Key())
                        .originalFilename(result.originalFilename())
                        .mimeType(result.mimeType())
                        .sizeBytes(result.sizeBytes())
                        .isValid(true)
                        .uploadedBy(uploadedBy)
                        .build();
                photo = containerPhotoRepository.save(photo);

                uploaded.add(PhotoDTO.builder()
                        .photoId(photo.getId())
                        .r2Key(photo.getR2Key())
                        .presignedUrl(fileStorageService.generatePresignedUrl(photo.getR2Key(), PRESIGN_TTL))
                        .originalFilename(photo.getOriginalFilename())
                        .isValid(true)
                        .uploadedAt(photo.getUploadedAt())
                        .build());
            } catch (Exception e) {
                log.warn("Skipping failed photo upload for container {}: {}", containerId,
                        file.getOriginalFilename(), e);
                failed.add(file.getOriginalFilename());
            }
        }

        if (!uploaded.isEmpty()) {
            auditService.log("CONTAINER", containerId, AuditAction.UPDATE, "photos",
                    null, uploaded.size() + " photo(s) uploaded", uploadedBy);
        }

        return PhotoUploadResultDTO.builder().uploaded(uploaded).failedFilenames(failed).build();
    }

    public List<PhotoDTO> listPhotos(Long containerId) {
        findContainer(containerId);
        return containerPhotoRepository.findByContainerId(containerId).stream()
                .map(p -> PhotoDTO.builder()
                        .photoId(p.getId())
                        .r2Key(p.getR2Key())
                        .presignedUrl(fileStorageService.generatePresignedUrl(p.getR2Key(), PRESIGN_TTL))
                        .originalFilename(p.getOriginalFilename())
                        .isValid(p.getIsValid())
                        .uploadedAt(p.getUploadedAt())
                        .build())
                .toList();
    }

    @Transactional
    public void invalidatePhoto(Long containerId, Long photoId, String reason, Long performedBy) {
        ContainerPhoto photo = containerPhotoRepository.findById(photoId)
                .orElseThrow(() -> new NotFoundException("Foto no encontrada."));
        if (!photo.getContainerId().equals(containerId)) {
            throw new NotFoundException("Foto no encontrada para este contenedor.");
        }
        photo.setIsValid(false);
        photo.setInvalidationReason(reason);
        containerPhotoRepository.save(photo);
        auditService.log("CONTAINER", containerId, AuditAction.UPDATE, "photo_invalidated",
                null, "photoId=" + photoId + " reason=" + reason, performedBy);
    }

    private Container findContainer(Long id) {
        return containerRepository.findById(id).orElseThrow(() -> new NotFoundException("Contenedor no encontrado."));
    }
}
