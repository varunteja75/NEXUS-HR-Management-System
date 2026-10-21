# NexusHR

**NexusHR – Workforce Intelligence Dashboard** is a focused Spring Boot MVP developed as part of the Amdox Java Full-Stack Development internship. It provides an HR-admin dashboard backed by REST APIs and seeded demo data for employee management, leave requests, attendance, payroll-cost monitoring, employee engagement, and attrition-risk views.

The project demonstrates a modular backend architecture, REST API development, database integration, and workforce dashboard functionality without requiring complex cloud infrastructure.

## Features

- **Employee Management:** Create, retrieve, update, and delete employee records.
- **Leave Management:** Retrieve leave requests and update their approval status.
- **Attendance Monitoring:** Access daily attendance information through a REST API.
- **Workforce Dashboard:** View workforce metrics and HR-related indicators.
- **Payroll-Cost Views:** Present payroll-related cost information.
- **Engagement and Attrition-Risk Views:** Display workforce indicators based on the available application data.
- **Seeded Demo Data:** Run and demonstrate the application using sample workforce records.
- **REST API:** Expose core HR operations through HTTP endpoints.
- **H2 Database:** Use lightweight in-memory storage for local development.

## Technology Stack

- Java 17+
- Spring Boot
- Spring Data JPA
- H2 In-Memory Database
- Maven 3.9+
- RESTful APIs
- Web-based HR-admin dashboard

## System Architecture

NexusHR follows a **modular monolithic architecture** in which the core HR workflows run within a single Spring Boot application.

The application uses REST controllers to handle HTTP requests, backend components to process application logic, Spring Data JPA for data access, and H2 for in-memory persistence.

This architecture keeps the MVP simple to run and maintain while providing a foundation for future expansion.

## Run Locally

### Prerequisites

- Java 17 or later
- Maven 3.9 or later

### Steps

Clone the repository:

```bash
git clone https://github.com/varunteja75/NEXUS-HR-Management-System.git
```

Navigate to the project directory:

```bash
cd NEXUS-HR-Management-System
```

Start the application:

```bash
mvn spring-boot:run
```

Open the application in your browser:

`http://localhost:8080`

### H2 Database Console

The H2 console is available at:

`http://localhost:8080/h2-console`

JDBC URL:

`jdbc:h2:mem:nexushr`

Use the username and password configured in the application. With the default H2 credentials, the username is `sa` and the password is blank.

## API Reference

### Employees

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/employees` | Retrieve all employees |
| POST | `/api/v1/employees` | Create an employee |
| GET | `/api/v1/employees/{id}` | Retrieve an employee by ID |
| PUT | `/api/v1/employees/{id}` | Update an employee |
| DELETE | `/api/v1/employees/{id}` | Delete an employee |

### Leave Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/leaves` | Retrieve leave requests |
| PATCH | `/api/v1/leaves/{id}/status?value=MANAGER_APPROVED` | Update a leave request's status |

### Dashboard and Attendance

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/dashboard` | Retrieve dashboard metrics |
| GET | `/api/v1/attendance/today` | Retrieve today's attendance information |

## Configuration and Data

The application uses an H2 in-memory database with the JDBC URL `jdbc:h2:mem:nexushr`. Seeded demo data supports local execution and dashboard demonstrations.

Because the database is in memory, data may not persist after the application stops. No external database server or cloud credentials are required for the intended local MVP workflow.

## Deliberate MVP Scope

The original brief targets a multi-service enterprise deployment. This repository implements the central dashboard and core HR workflows as a **single modular Spring Boot service** with in-memory H2 storage.

The MVP prioritizes ease of setup, core functionality, and demonstration of full-stack development concepts over production-scale infrastructure.

## Future Enhancements

Potential next steps for a production-oriented version include:

- **PostgreSQL:** Persistent relational storage.
- **JWT / Keycloak:** Authentication and role-based access control.
- **Apache Kafka:** Event-driven communication.
- **Redis:** Caching and performance optimization.
- **File Storage:** Employee document management.
- **Separate Domain Services:** Independent services for employee, attendance, leave, and payroll workflows.
- **Automated Testing and CI/CD:** Expanded test coverage and automated build and deployment workflows.

These are proposed enhancements and are not claimed as implemented features of the current MVP.

## Project Links

- **GitHub Repository:** https://github.com/varunteja75/NEXUS-HR-Management-System
- **Live Application:** https://nexus
