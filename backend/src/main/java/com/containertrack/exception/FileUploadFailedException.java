package com.containertrack.exception;

/** Thrown when a single file's upload to R2 fails after all retries; caller may skip it and continue the batch. */
public class FileUploadFailedException extends RuntimeException {
    public FileUploadFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
