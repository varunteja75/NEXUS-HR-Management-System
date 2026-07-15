# NexusHR

NexusHR is a focused Spring Boot MVP of the Amdox Java Full-Stack brief. It provides an HR-admin dashboard backed by a REST API and seeded demo data for employee, leave, attendance, payroll-cost, engagement, and attrition-risk views.

## Run locally

Prerequisite: Java 17+ and Maven 3.9+.

```bash
mvn spring-boot:run
```

Then open `http://localhost:8080`. The H2 console is at `/h2-console` (JDBC URL: `jdbc:h2:mem:nexushr`).

## Included API

- `GET/POST /api/v1/employees`
- `GET/PUT/DELETE /api/v1/employees/{id}`
- `GET /api/v1/leaves`
- `PATCH /api/v1/leaves/{id}/status?value=MANAGER_APPROVED`
- `GET /api/v1/dashboard`
- `GET /api/v1/attendance/today`

## Deliberate MVP scope

The supplied brief targets a multi-service, enterprise deployment. This repository implements the central dashboard and core HR workflows as one modular Spring Boot service with in-memory H2 storage, so it is runnable without cloud credentials or infrastructure. PostgreSQL, JWT/Keycloak, Kafka, Redis, file storage, and separate domain services are the natural next production steps.
