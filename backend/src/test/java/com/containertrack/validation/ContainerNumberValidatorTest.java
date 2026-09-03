package com.containertrack.validation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ContainerNumberValidatorTest {

    @Test
    void canonicalExampleIsValid() {
        // CSQU3054383 is the canonical worked example from the ISO 6346 standard.
        assertTrue(ContainerNumberValidator.isValidContainerNumber("CSQU3054383"));
    }

    @Test
    void mutatingCheckDigitFails() {
        assertFalse(ContainerNumberValidator.isValidContainerNumber("CSQU3054384"));
        assertFalse(ContainerNumberValidator.isValidContainerNumber("CSQU3054380"));
    }

    @Test
    void invalidFormatFails() {
        assertFalse(ContainerNumberValidator.isValidContainerNumber("CSQ3054383")); // missing category letter
        assertFalse(ContainerNumberValidator.isValidContainerNumber("csqu3054383")); // lowercase
        assertFalse(ContainerNumberValidator.isValidContainerNumber(null));
        assertFalse(ContainerNumberValidator.isValidContainerNumber("CSQU305438")); // too short
    }

    @Test
    void realWorldCarrierPrefixesAreValid() {
        // Check digits computed via the exact algorithm implemented in ContainerNumberValidator
        // (2^position weighting, mod 11, mod==10 -> 0), for well-known carrier owner-codes.
        assertTrue(ContainerNumberValidator.isValidContainerNumber("MSCU1234566")); // MSC
        assertTrue(ContainerNumberValidator.isValidContainerNumber("MAEU9876542")); // Maersk
        assertTrue(ContainerNumberValidator.isValidContainerNumber("TCLU2001236")); // Triton / TAL
        assertTrue(ContainerNumberValidator.isValidContainerNumber("HLXU5003663")); // Hapag-Lloyd
    }

    @Test
    void wrongLengthFails() {
        assertFalse(ContainerNumberValidator.isValidContainerNumber("MSCU123456")); // 10 chars, missing check digit
        assertFalse(ContainerNumberValidator.isValidContainerNumber("MSCU12345666")); // 12 chars, one too many
    }

    @Test
    void lowercaseLettersFail() {
        assertFalse(ContainerNumberValidator.isValidContainerNumber("mscu1234566"));
        assertFalse(ContainerNumberValidator.isValidContainerNumber("MSCu1234566"));
    }

    @Test
    void nonOwnerCategoryFourthLetterFails() {
        // Only U (freight), J (detachable equipment), Z (trailer/chassis) are valid category identifiers.
        assertFalse(ContainerNumberValidator.isValidContainerNumber("MSCX1234566"));
        assertFalse(ContainerNumberValidator.isValidContainerNumber("MSCA1234566"));
    }
}
