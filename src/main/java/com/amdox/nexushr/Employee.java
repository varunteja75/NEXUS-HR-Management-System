package com.amdox.nexushr;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name="employees")
public class Employee {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @NotBlank private String name; @Email @Column(unique=true) private String email; @NotBlank private String department; private String title; private String status; private LocalDate hireDate; private BigDecimal annualSalary; private int leaveBalance; private int engagementScore; private int attritionRisk;
  private boolean checkedIn;
  private String checkInType;
  private java.time.LocalTime checkInTime;
  private String skills;
  @Column(length = 1000) private String bio;
  protected Employee() {}
  public Employee(String name,String email,String department,String title,String status,LocalDate hireDate,BigDecimal annualSalary,int leaveBalance,int engagementScore,int attritionRisk){this.name=name;this.email=email;this.department=department;this.title=title;this.status=status;this.hireDate=hireDate;this.annualSalary=annualSalary;this.leaveBalance=leaveBalance;this.engagementScore=engagementScore;this.attritionRisk=attritionRisk;this.checkedIn=false;this.checkInType=null;this.checkInTime=null;this.skills="Java, Spring Boot, SQL, REST APIs";this.bio="A dedicated member of the NexusHR team who strives to deliver excellence.";}
  public Long getId(){return id;} public String getName(){return name;} public String getEmail(){return email;} public String getDepartment(){return department;} public String getTitle(){return title;} public String getStatus(){return status;} public LocalDate getHireDate(){return hireDate;} public BigDecimal getAnnualSalary(){return annualSalary;} public int getLeaveBalance(){return leaveBalance;} public int getEngagementScore(){return engagementScore;} public int getAttritionRisk(){return attritionRisk;}
  public String getSkills(){return skills;} public String getBio(){return bio;}
  public boolean isCheckedIn(){return checkedIn;} public String getCheckInType(){return checkInType;} public java.time.LocalTime getCheckInTime(){return checkInTime;}
  public void clockIn(String type){this.checkedIn=true;this.checkInType=type;this.checkInTime=java.time.LocalTime.now().withNano(0);}
  public void clockOut(){this.checkedIn=false;this.checkInType=null;this.checkInTime=null;}
  public void deductLeave(int days){this.leaveBalance=Math.max(0,this.leaveBalance-days);}
  public void update(EmployeeInput i){name=i.name();email=i.email();department=i.department();title=i.title();status=i.status();annualSalary=i.annualSalary();leaveBalance=i.leaveBalance();engagementScore=i.engagementScore();attritionRisk=i.attritionRisk();skills=i.skills();bio=i.bio();}
}
