package com.containertrack.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Validates container numbers against the ISO 6346 format and check digit algorithm.
 * Format: 3 owner-code letters + 1 category letter (U/J/Z) + 6 serial digits + 1 check digit.
 * Example (canonical, valid): CSQU3054383
 */
public class ContainerNumberValidator implements ConstraintValidator<ContainerNumber, String> {

    private static final Pattern FORMAT = Pattern.compile("^[A-Z]{3}[UJZ][0-9]{6}[0-9]$");

    private static final Map<Character, Integer> LETTER_VALUES = buildLetterValues();

    private static Map<Character, Integer> buildLetterValues() {
        Map<Character, Integer> map = new HashMap<>();
        int value = 10;
        for (char c = 'A'; c <= 'Z'; c++) {
            if (value % 11 == 0) {
                value++;
            }
            map.put(c, value);
            value++;
        }
        return map;
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true; // let @NotBlank handle presence
        }
        return isValidContainerNumber(value);
    }

    public static boolean isValidContainerNumber(String containerNumber) {
        if (containerNumber == null || !FORMAT.matcher(containerNumber).matches()) {
            return false;
        }

        long sum = 0;
        for (int i = 0; i < 10; i++) {
            char c = containerNumber.charAt(i);
            int charValue;
            if (Character.isLetter(c)) {
                Integer v = LETTER_VALUES.get(c);
                if (v == null) return false;
                charValue = v;
            } else {
                charValue = c - '0';
            }
            sum += (long) charValue * (1L << i); // 2^position, position 0..9
        }

        int mod = (int) (sum % 11);
        int checkDigit = (mod == 10) ? 0 : mod;

        int actualCheckDigit = containerNumber.charAt(10) - '0';
        return checkDigit == actualCheckDigit;
    }
}
