package com.amdox.nexushr;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record LeaveRequestInput(
    @NotBlank String type,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    String reason
) {}
