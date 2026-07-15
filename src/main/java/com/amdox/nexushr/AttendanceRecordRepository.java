package com.amdox.nexushr;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
  List<AttendanceRecord> findByEmployeeIdOrderByDateDescCheckInTimeDesc(Long employeeId);
}
