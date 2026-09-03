package com.containertrack.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ContainerNumberValidator.class)
@Documented
public @interface ContainerNumber {
    String message() default "Número de contenedor inválido (formato o dígito de control ISO 6346 incorrecto).";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
