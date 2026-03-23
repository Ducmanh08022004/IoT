# IoT Smart Home Dashboard

### Giới thiệu

Hệ thống IoT Smart Home gồm:
- Backend Spring Boot để nhận dữ liệu cảm biến, điều khiển thiết bị và lưu lịch sử.
- Frontend React + TypeScript để hiển thị dashboard realtime và quản lý lịch sử.
- MQTT + WebSocket/STOMP để đồng bộ dữ liệu thời gian thực.

### Tính năng chính

- Hiển thị dữ liệu cảm biến realtime (nhiệt độ, độ ẩm, ánh sáng).
- Điều khiển thiết bị (fan, air_condition, light_bulb) qua MQTT.
- Ghi và theo dõi lịch sử thao tác thiết bị (Pending, SUCCESS, FAILED).
- Lọc, sắp xếp, phân trang dữ liệu sensor và action history.
- Cập nhật realtime trên frontend qua topic WebSocket.

### Công nghệ sử dụng

#### Backend (BE)
- Java 21
- Spring Boot 4
- Spring Web, Spring Data JPA, Spring Integration MQTT
- WebSocket (STOMP)
- MySQL
- Maven

#### Frontend (FE)
- React 19 + TypeScript
- Vite
- React Router
- Recharts
- STOMPJS + SockJS

### Cấu trúc dự án

```text
IoT/
|-- BE/   # Spring Boot backend
|-- FE/   # React frontend
```

### Yêu cầu môi trường

- Java 21
- Maven 3.9+
- Node.js 18+ (khuyến nghị Node.js 20 LTS)
- MySQL 8+
- MQTT Broker (đang cấu hình mặc định: tcp://localhost:1884)

### Cấu hình backend

File cấu hình: BE/src/main/resources/application.properties

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/iot
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

Lưu ý:
- Trong code hiện tại, MQTT broker đang được đặt cứng trong MqttConfig:
  - Broker: tcp://localhost:1884
  - Username: manh
  - Password: 123456
- Nên đưa các thông số này ra environment variables trước khi deploy production.

### Chạy backend

```bash
cd BE
./mvnw spring-boot:run
```

Nếu dùng Windows PowerShell:

```powershell
cd BE
.\mvnw.cmd spring-boot:run
```

Backend mặc định chạy tại: http://localhost:8080

### Chạy frontend

```bash
cd FE
npm install
npm run dev
```

Frontend mặc định chạy tại: http://localhost:5173

### API chính

#### 1) Điều khiển thiết bị

POST /api/device/control?led={device}&action={on|off}

Ví dụ:

```http
POST /api/device/control?led=fan&action=on
```

#### 2) Tìm kiếm dữ liệu sensor

GET /api/data-sensor/search

Query params:
- nameSensor (optional)
- value (optional)
- dateTime (optional, định dạng YYYY-MM-DD)
- page (default: 0)
- size (default: 10)
- sortBy (default: dateTime)
- direction (default: desc)

#### 3) Tìm kiếm lịch sử thao tác

GET /api/action-history/search

Query params:
- nameDevice (optional)
- status (optional)
- action (optional)
- date (optional, định dạng YYYY-MM-DD)
- page (default: 0)
- size (default: 10)
- sortBy (default: dateTime)
- direction (default: desc)

### Realtime channels

- STOMP endpoint: /ws
- Topics:
  - /topic/sensor
  - /topic/device-status

MQTT topics backend đang subscribe/publish:
- sensor/data
- device/control
- device/status

### Luồng dữ liệu tổng quan

1. ESP32 publish dữ liệu lên sensor/data.
2. Backend nhận MQTT, lưu DB, push realtime lên /topic/sensor.
3. Frontend gửi lệnh điều khiển POST /api/device/control.
4. Backend publish lệnh qua device/control, lưu action với trạng thái Pending.
5. ESP32 phản hồi qua device/status, backend cập nhật trạng thái thành SUCCESS hoặc FAILED, đồng thời push /topic/device-status.

### Build

#### Backend

```bash
cd BE
./mvnw clean package
```

#### Frontend

```bash
cd FE
npm run build
```

### Tác giả

- Trương Đức Mạnh

---

### Overview

The IoT Smart Home system includes:
- A Spring Boot backend for sensor ingestion, device control, and history persistence.
- A React + TypeScript frontend for realtime dashboard visualization and history management.
- MQTT + WebSocket/STOMP for realtime data synchronization.

### Key Features

- Realtime sensor monitoring (temperature, humidity, light).
- Device control (fan, air_condition, light_bulb) via MQTT.
- Action history tracking with statuses (Pending, SUCCESS, FAILED).
- Filtering, sorting, and pagination for sensor data and action history.
- Realtime UI updates through WebSocket topics.

### Tech Stack

#### Backend (BE)
- Java 21
- Spring Boot 4
- Spring Web, Spring Data JPA, Spring Integration MQTT
- WebSocket (STOMP)
- MySQL
- Maven

#### Frontend (FE)
- React 19 + TypeScript
- Vite
- React Router
- Recharts
- STOMPJS + SockJS

### Project Structure

```text
IoT/
|-- BE/   # Spring Boot backend
|-- FE/   # React frontend
```

### Environment Requirements

- Java 21
- Maven 3.9+
- Node.js 18+ (Node.js 20 LTS recommended)
- MySQL 8+
- MQTT Broker (currently configured by default at tcp://localhost:1884)

### Backend Configuration

Configuration file: BE/src/main/resources/application.properties

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/iot
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

Notes:
- In the current codebase, MQTT broker settings are hardcoded in MqttConfig:
  - Broker: tcp://localhost:1884
  - Username: manh
  - Password: 123456
- You should move these values to environment variables before production deployment.

### Run Backend

```bash
cd BE
./mvnw spring-boot:run
```

For Windows PowerShell:

```powershell
cd BE
.\mvnw.cmd spring-boot:run
```

Default backend URL: http://localhost:8080

### Run Frontend

```bash
cd FE
npm install
npm run dev
```

Default frontend URL: http://localhost:5173

### Main APIs

#### 1) Device Control

POST /api/device/control?led={device}&action={on|off}

Example:

```http
POST /api/device/control?led=fan&action=on
```

#### 2) Sensor Data Search

GET /api/data-sensor/search

Query params:
- nameSensor (optional)
- value (optional)
- dateTime (optional, format YYYY-MM-DD)
- page (default: 0)
- size (default: 10)
- sortBy (default: dateTime)
- direction (default: desc)

#### 3) Action History Search

GET /api/action-history/search

Query params:
- nameDevice (optional)
- status (optional)
- action (optional)
- date (optional, format YYYY-MM-DD)
- page (default: 0)
- size (default: 10)
- sortBy (default: dateTime)
- direction (default: desc)

### Realtime Channels

- STOMP endpoint: /ws
- Topics:
  - /topic/sensor
  - /topic/device-status

MQTT topics currently used for subscribe/publish:
- sensor/data
- device/control
- device/status

### Data Flow Overview

1. ESP32 publishes sensor payloads to sensor/data.
2. Backend consumes MQTT messages, stores data in DB, and broadcasts to /topic/sensor.
3. Frontend sends control commands through POST /api/device/control.
4. Backend publishes commands to device/control and stores action records as Pending.
5. ESP32 responds on device/status, backend updates status to SUCCESS or FAILED, and broadcasts /topic/device-status.

### Build

#### Backend

```bash
cd BE
./mvnw clean package
```

#### Frontend

```bash
cd FE
npm run build
```

### Author

- Truong Duc Manh
