package com.amdox.nexushr;
import jakarta.validation.constraints.*; import java.math.BigDecimal;
public record EmployeeInput(@NotBlank String name, @Email String email, @NotBlank String department, @NotBlank String title, @NotBlank String status, @NotNull @PositiveOrZero BigDecimal annualSalary, @PositiveOrZero int leaveBalance, @Min(0) @Max(100) int engagementScore, @Min(0) @Max(100) int attritionRisk, String skills, String bio) {}
