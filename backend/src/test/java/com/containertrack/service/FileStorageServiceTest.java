package com.containertrack.service;

import com.amazonaws.services.s3.AmazonS3;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.FileUploadFailedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    private static final byte[] JPEG_BYTES = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01, 0x02};
    private static final byte[] PNG_BYTES = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x01, 0x02};
    private static final byte[] WEBP_BYTES = {
            'R', 'I', 'F', 'F', 0x00, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P',
    };

    @Mock
    private AmazonS3 amazonS3;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        fileStorageService = new FileStorageService(amazonS3);
        ReflectionTestUtils.setField(fileStorageService, "bucketName", "test-bucket");
    }

    @Test
    void uploadFileWithValidJpegSucceedsAndUploadsToS3() {
        MultipartFile file = new MockMultipartFile("files", "photo.jpg", "image/jpeg", JPEG_BYTES);

        FileStorageService.UploadedFile result = fileStorageService.uploadFile(file, "42");

        assertEquals("image/jpeg", result.mimeType());
        assertEquals("photo.jpg", result.originalFilename());
        assertTrue(result.r2Key().startsWith("containers/42/"));
        assertTrue(result.r2Key().endsWith("_photo.jpg"));
        verify(amazonS3).putObject(eq("test-bucket"), eq(result.r2Key()), any(), any());
    }

    @Test
    void uploadFileWithValidPngSucceeds() {
        MultipartFile file = new MockMultipartFile("files", "photo.png", "image/png", PNG_BYTES);

        FileStorageService.UploadedFile result = fileStorageService.uploadFile(file, "42");

        assertEquals("image/png", result.mimeType());
    }

    @Test
    void uploadFileWithValidWebpSucceeds() {
        MultipartFile file = new MockMultipartFile("files", "photo.webp", "image/webp", WEBP_BYTES);

        FileStorageService.UploadedFile result = fileStorageService.uploadFile(file, "42");

        assertEquals("image/webp", result.mimeType());
    }

    @Test
    void uploadFileWithDangerousExtensionThrowsBadRequest() {
        MultipartFile file = new MockMultipartFile("files", "virus.exe", "application/octet-stream", JPEG_BYTES);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> fileStorageService.uploadFile(file, "42"));

        assertEquals("DISALLOWED_FILE_TYPE", ex.getCode());
        verify(amazonS3, never()).putObject(anyString(), anyString(), any(), any());
    }

    @Test
    void uploadFileExceedingMaxSizeThrowsBadRequest() {
        byte[] oversized = new byte[11 * 1024 * 1024];
        MultipartFile file = new MockMultipartFile("files", "big.jpg", "image/jpeg", oversized);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> fileStorageService.uploadFile(file, "42"));

        assertEquals("FILE_TOO_LARGE", ex.getCode());
    }

    @Test
    void uploadFileWithContentNotMatchingAnyKnownImageFormatThrowsBadRequest() {
        byte[] garbage = {0x00, 0x01, 0x02, 0x03};
        MultipartFile file = new MockMultipartFile("files", "notreally.jpg", "application/octet-stream", garbage);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> fileStorageService.uploadFile(file, "42"));

        assertEquals("INVALID_FILE_CONTENT", ex.getCode());
    }

    @Test
    void uploadFileAcceptsHeicByDeclaredContentTypeOnly() {
        byte[] opaqueBytes = {0x10, 0x20, 0x30, 0x40};
        MultipartFile file = new MockMultipartFile("files", "photo.heic", "image/heic", opaqueBytes);

        FileStorageService.UploadedFile result = fileStorageService.uploadFile(file, "42");

        assertEquals("image/heic", result.mimeType());
    }

    @Test
    void deleteFileCallsS3DeleteObjectWithConfiguredBucket() {
        fileStorageService.deleteFile("containers/42/some-key.jpg");

        verify(amazonS3).deleteObject("test-bucket", "containers/42/some-key.jpg");
    }

    @Test
    void generatePresignedUrlReturnsUrlFromS3Client() throws Exception {
        URL fakeUrl = new URL("https://r2.example.com/signed?sig=abc");
        when(amazonS3.generatePresignedUrl(any())).thenReturn(fakeUrl);

        String result = fileStorageService.generatePresignedUrl("containers/42/key.jpg", Duration.ofMinutes(15));

        assertEquals(fakeUrl.toString(), result);
    }

    @Test
    void uploadRetriesOnTransientFailureThenSucceeds() {
        MultipartFile file = new MockMultipartFile("files", "photo.jpg", "image/jpeg", JPEG_BYTES);
        doThrow(new RuntimeException("transient R2 error"))
                .doReturn(null)
                .when(amazonS3).putObject(anyString(), anyString(), any(), any());

        FileStorageService.UploadedFile result = fileStorageService.uploadFile(file, "42");

        assertEquals("image/jpeg", result.mimeType());
        verify(amazonS3, org.mockito.Mockito.times(2)).putObject(anyString(), anyString(), any(), any());
    }

    @Test
    void uploadThrowsFileUploadFailedExceptionAfterExhaustingRetries() {
        MultipartFile file = new MockMultipartFile("files", "photo.jpg", "image/jpeg", JPEG_BYTES);
        doThrow(new RuntimeException("persistent R2 outage"))
                .when(amazonS3).putObject(anyString(), anyString(), any(), any());

        assertThrows(FileUploadFailedException.class, () -> fileStorageService.uploadFile(file, "42"));

        verify(amazonS3, org.mockito.Mockito.times(4)).putObject(anyString(), anyString(), any(), any());
    }
}
