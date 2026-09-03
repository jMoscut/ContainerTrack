package com.containertrack.service;

import com.containertrack.exception.BadRequestException;

import java.util.regex.Pattern;

public final class PasswordPolicy {

    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[^A-Za-z0-9]");

    private PasswordPolicy() {}

    public static void validate(String password) {
        if (password == null || password.length() < 8) {
            throw new BadRequestException("PASSWORD_POLICY_VIOLATION", "La contraseña debe tener al menos 8 caracteres.");
        }
        if (!UPPERCASE.matcher(password).find()) {
            throw new BadRequestException("PASSWORD_POLICY_VIOLATION", "La contraseña debe contener al menos una letra mayúscula.");
        }
        if (!DIGIT.matcher(password).find()) {
            throw new BadRequestException("PASSWORD_POLICY_VIOLATION", "La contraseña debe contener al menos un número.");
        }
        if (!SPECIAL.matcher(password).find()) {
            throw new BadRequestException("PASSWORD_POLICY_VIOLATION", "La contraseña debe contener al menos un carácter especial.");
        }
    }
}
