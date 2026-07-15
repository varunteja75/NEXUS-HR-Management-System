package com.amdox.nexushr;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@SpringBootApplication
public class NexusHrApplication {
  public static void main(String[] args) { SpringApplication.run(NexusHrApplication.class, args); }

  @Bean CommandLineRunner seed(EmployeeRepository employees, LeaveRequestRepository leaves, AttendanceRecordRepository attendanceRecords) {
    return args -> {
      var all = List.of(
        new Employee("Aarav Mehta", "aarav.mehta@nexushr.demo", "Engineering", "Senior Software Engineer", "ACTIVE", LocalDate.of(2022, 2, 14), new BigDecimal("1650000"), 14, 82, 9),
        new Employee("Maya Iyer", "maya.iyer@nexushr.demo", "People Operations", "HR Business Partner", "ACTIVE", LocalDate.of(2021, 8, 1), new BigDecimal("1350000"), 18, 91, 3),
        new Employee("Rohan Shah", "rohan.shah@nexushr.demo", "Finance", "Finance Analyst", "ON_LEAVE", LocalDate.of(2023, 1, 9), new BigDecimal("980000"), 7, 74, 16),
        new Employee("Nisha Rao", "nisha.rao@nexushr.demo", "Engineering", "Product Manager", "ACTIVE", LocalDate.of(2020, 6, 18), new BigDecimal("1850000"), 11, 88, 5),
        new Employee("Kabir Khan", "kabir.khan@nexushr.demo", "Sales", "Account Executive", "ACTIVE", LocalDate.of(2024, 3, 4), new BigDecimal("850000"), 20, 77, 21),
        new Employee("Ananya Das", "ananya.das@nexushr.demo", "Design", "UX Designer", "ACTIVE", LocalDate.of(2022, 10, 10), new BigDecimal("1200000"), 16, 86, 7));
      all.get(0).clockIn("OFFICE");
      all.get(1).clockIn("OFFICE");
      all.get(3).clockIn("REMOTE");
      employees.saveAll(all);
      leaves.saveAll(List.of(new LeaveRequest(all.get(2), "Sick Leave", LocalDate.now().minusDays(1), LocalDate.now().plusDays(1), "MANAGER_APPROVED", "Severe stomach infection"), new LeaveRequest(all.get(0), "Casual Leave", LocalDate.now().plusDays(8), LocalDate.now().plusDays(9), "PENDING", "Attending sister's wedding")));
      var today = LocalDate.now();
      var r1 = new AttendanceRecord(all.get(0), today.minusDays(2), LocalTime.of(9, 15), "OFFICE"); r1.setCheckOutTime(LocalTime.of(18, 5));
      var r2 = new AttendanceRecord(all.get(0), today.minusDays(1), LocalTime.of(9, 5), "OFFICE"); r2.setCheckOutTime(LocalTime.of(17, 50));
      var r3 = new AttendanceRecord(all.get(0), today, LocalTime.of(9, 10), "OFFICE");
      var r4 = new AttendanceRecord(all.get(1), today.minusDays(1), LocalTime.of(9, 30), "OFFICE"); r4.setCheckOutTime(LocalTime.of(18, 15));
      var r5 = new AttendanceRecord(all.get(1), today, LocalTime.of(9, 20), "OFFICE");
      var r6 = new AttendanceRecord(all.get(3), today, LocalTime.of(10, 0), "REMOTE");
      attendanceRecords.saveAll(List.of(r1, r2, r3, r4, r5, r6));
    };
  }
}
