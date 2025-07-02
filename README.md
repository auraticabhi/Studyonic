# Studyonic - A Distributed Cloud-Native Ed-Tech Platform

**Live Demo:** http://56.228.25.38/

**Studyonic** is a full-stack, production-grade educational technology platform architected from the ground up as a scalable, resilient, and event-driven distributed system. It is engineered with a modern microservice architecture, demonstrating best practices in system design, DevOps, and cloud-native deployment.

---

## 🏛️ High-Level Architecture

The platform is built on a decoupled microservice architecture. Services communicate both synchronously via a central API Gateway and asynchronously through a Kafka event bus, ensuring high throughput and resilience. Redis provides a high-performance caching and rate-limiting layer. The entire system is containerized with Docker and deployed automatically to AWS EC2.

<div align="center" ><img src="https://res.cloudinary.com/df6k7nqy7/image/upload/v1751478748/snfinal_2_vdyz9c.png" alt="architecture_diagram"></div>

---

## 🛠️ Tech Stack & Key Concepts

### **Backend & Architecture**

- **Microservices:** The application is decomposed into 5+ distinct services (User, Course, Payment, Notification, API Gateway).
- **Node.js & Express.js:** The runtime and framework for all backend services.
- **MongoDB & Mongoose:** Primary database for application data, hosted on MongoDB Atlas.
- **Kafka:** Used as an event bus for asynchronous communication, ensuring services are loosely coupled and resilient (e.g., for processing enrollments and sending notifications after payment).
- **Redis:** Implemented for high-performance caching (with proactive invalidation) and API rate limiting to enhance performance and security.
- **API Gateway:** A custom gateway built with Node.js and `axios` handles user authentication, request routing, and API composition, providing a secure and unified entry point to the system.

### **DevOps & Deployment**

- **Docker & Docker Compose:** The entire application stack, including services and infrastructure is fully containerized for consistent development and production environments.
- **CI/CD with GitHub Actions:**
  - **Continuous Integration:** Independent CI pipelines for each service, workflows automatically build, version, and publish Docker images to Docker Hub.
  - **Continuous Deployment:** A master deployment workflow automatically deploys the entire application stack to AWS with zero downtime after successful builds.
- **AWS:** Deployed on an **EC2** instance, for practical cloud infrastructure management.
- **Nginx:** Used as a high-performance web server to serve the static frontend and proxy API requests.

### **Frontend**

- **React.js:** A modern, component-based UI library.
- **Redux Toolkit:** For robust and predictable state management.
- **Axios & Axios-Retry:** For resilient client-side API communication with automatic retries on transient network errors.
- **Tailwind CSS:** For rapid and utility-first UI development.

---

## ✨ Core Features

- **User Authentication & Profiles:** Secure JWT-based authentication, user profile management, and role-based access control (Student, Instructor, Admin).
- **Course Management:** Instructors can create, edit, and manage courses, including sections and video lectures.
- **Course Enrollment & Payments:** Secure payment integration with Razorpay to handle course purchases.
- **Student Dashboard:** Students can view enrolled courses, track their progress, and watch lectures.
- **Ratings and Reviews:** Students can rate and review courses they have completed.
- **Public Catalog:** A public-facing catalog to browse and search for available courses and categories.

## 🚀 Running the Project Locally

To run the entire platform on your local machine, you will need to have Docker and Docker Compose installed.

**1. Clone the Repository:**

```bash
git clone https://github.com/auraticabhi/Studyonic.git
cd Studyonic
```

**2. Create the Production Environment File:** The application uses a master `.env.prod` file for all secrets and configurations. Create this file in the root directory and populate it with your own keys.

example `.env.prod` 

```env
# GLOBAL & SHARED VARIABLES
NODE_ENV=production
JWT_SECRET="your_jwt_secret"

# MongoDB Connection URL
MONGODB_URL=""

# Internal Service URLs
USER_SERVICE_URL=http://user-service:8001
COURSE_SERVICE_URL=http://course-service:8002
PAYMENT_SERVICE_URL=http://payment-service:8003
NOTIFICATION_SERVICE_URL=http://notification-service:8004

# EXTERNAL URLs
FRONTEND_URL=

# INFRASTRUCTURE
KAFKA_BROKERS=kafka:9092 (if not using Confluent)
REDIS_URL=redis://redis:6379

# THIRD-PARTY API SECRETS
CLOUD_NAME="your_cloud_name"
API_KEY="your_api_key"
API_SECRET="your_api_secret"
FOLDER_NAME=""

# Razorpay API Credentials
RAZORPAY_KEY="your_razorpay_key"
RAZORPAY_SECRET="your_razorpay_secret"

# Email Service Credentials
MAIL_HOST="smtp.gmail.com"
MAIL_USER="your_email@gmail.com"
MAIL_PASS="your_app_password"
ADMIN_MAIL=""

# Environment Variables
REACT_APP_BASE_URL="http://backend_domain:8000/api/v1"
REACT_APP_RAZORPAY_KEY="your_razorpay_key"

# Confluent Cloud Kafka Credentials
KAFKA_BOOTSTRAP_SERVER=
KAFKA_API_KEY=confluent_api_key
KAFKA_API_SECRET=confluent_api_secret

DOCKER_USERNAME=docker_username
```

**3. Build and Run with Docker:** The `docker-compose.yml` file is configured to build and run all services.

```bash
docker compose up -d
```

The application will be available at:

- **Frontend:** `http://localhost:80`
- **API Gateway:** `http://localhost:8000/` 

---

Key highlights:

- A robust microservice architecture.
- Automated CI/CD pipelines for zero-downtime deployments.
- Scalable infrastructure leveraging AWS, Docker, and Kafka.
- Secure and performant design with JWT authentication, Redis caching, and rate limiting.
- Proper handling of cross-service references using API composition, avoiding tight coupling between services.

For any questions or feedback, please reach out via GitHub Issues or email: abhijeetgupta989@gmail.com.
