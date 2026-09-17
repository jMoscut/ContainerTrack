package com.containertrack.service;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.GeneratePresignedUrlRequest;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.FileUploadFailedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URL;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
            "exe", "sh", "php", "bat", "js", "cmd", "com", "msi", "jar", "vbs", "ps1", "py", "rb", "pl", "app");

    private final AmazonS3 amazonS3;

    @Value("${r2.bucket-name}")
    private String bucketName;

    public record UploadedFile(String r2Key, String originalFilename, String mimeType, long sizeBytes) {}

    public UploadedFile uploadFile(MultipartFile file, String containerId) {
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String extension = extractExtension(originalFilename).toLowerCase();

        if (DANGEROUS_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("DISALLOWED_FILE_TYPE", "Tipo de archivo no permitido: ." + extension);
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BadRequestException("FILE_TOO_LARGE", "El archivo excede el tamaño máximo de 10MB.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("FILE_READ_ERROR", "No se pudo leer el archivo.");
        }

        String detectedMime = sniffMimeType(bytes, file.getContentType());
        if (detectedMime == null) {
            throw new BadRequestException("INVALID_FILE_CONTENT", "El contenido del archivo no coincide con un tipo de imagen permitido (JPEG/PNG/WEBP/HEIC).");
        }

        String sanitizedName = sanitizeFilename(originalFilename);
        String key = "containers/" + containerId + "/" + System.currentTimeMillis() + "_" + sanitizedName;

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(bytes.length);
        metadata.setContentType(detectedMime);

        uploadWithRetry(key, bytes, metadata);

        return new UploadedFile(key, originalFilename, detectedMime, bytes.length);
    }

    private void uploadWithRetry(String key, byte[] bytes, ObjectMetadata metadata) {
        int[] backoffsMs = {500, 1000, 2000};
        RuntimeException lastError = null;
        for (int attempt = 0; attempt <= backoffsMs.length; attempt++) {
            try {
                amazonS3.putObject(bucketName, key, new ByteArrayInputStream(bytes), metadata);
                return;
            } catch (RuntimeException e) {
                lastError = e;
                if (attempt < backoffsMs.length) {
                    try {
                        Thread.sleep(backoffsMs[attempt]);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }
        throw new FileUploadFailedException("Failed to upload file to R2 after retries: " + key, lastError);
    }

    public void deleteFile(String r2Key) {
        amazonS3.deleteObject(bucketName, r2Key);
    }

    public String generatePresignedUrl(String r2Key, Duration expiry) {
        Date expiration = new Date(System.currentTimeMillis() + expiry.toMillis());
        GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(bucketName, r2Key)
                .withMethod(HttpMethod.GET)
                .withExpiration(expiration);
        URL url = amazonS3.generatePresignedUrl(request);
        return url.toString();
    }

    private String extractExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        return idx >= 0 && idx < filename.length() - 1 ? filename.substring(idx + 1) : "";
    }

    private String sanitizeFilename(String filename) {
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /**
     * Sniffs magic bytes for JPEG, PNG, WEBP. HEIC is accepted based on declared content-type
     * (documented limitation: reliable HEIC magic-byte sniffing requires parsing the ISO-BMFF
     * 'ftyp' box, which is out of scope here).
     */
    private String sniffMimeType(byte[] bytes, String declaredContentType) {
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (bytes.length >= 4 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return "image/png";
        }
        if (bytes.length >= 12
                && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) {
            return "image/webp";
        }
        if (declaredContentType != null && (declaredContentType.equalsIgnoreCase("image/heic")
                || declaredContentType.equalsIgnoreCase("image/heif"))) {
            return declaredContentType.toLowerCase();
        }
        return null;
    }
}
