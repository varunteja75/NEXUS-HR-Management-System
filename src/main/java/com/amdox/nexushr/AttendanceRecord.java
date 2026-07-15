package com.amdox.nexushr;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name="attendance_records")
public class AttendanceRecord {
  @Id
  @GeneratedValue(strategy=GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional=false)
  private Employee employee;

  private LocalDate date;
  private LocalTime checkInTime;
  private LocalTime checkOutTime;
  private String type; // "OFFICE" or "REMOTE"

  protected AttendanceRecord() {}

  public AttendanceRecord(Employee employee, LocalDate date, LocalTime checkInTime, String type) {
    this.employee = employee;
    this.date = date;
    this.checkInTime = checkInTime;
    this.type = type;
  }

  public Long getId() { return id; }
  public Employee getEmployee() { return employee; }
  public LocalDate getDate() { return date; }
  public LocalTime getCheckInTime() { return checkInTime; }
  public LocalTime getCheckOutTime() { return checkOutTime; }
  public void setCheckOutTime(LocalTime checkOutTime) { this.checkOutTime = checkOutTime; }
  public String getType() { return type; }
}
