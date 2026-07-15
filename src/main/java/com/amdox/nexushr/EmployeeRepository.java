package com.amdox.nexushr;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface EmployeeRepository extends JpaRepository<Employee,Long> { List<Employee> findByDepartmentIgnoreCase(String department); }
