# IoT Smart Home Frontend

Frontend dashboard built with React, TypeScript, and Vite. The project contains four pages based on the provided mockups:

- Dashboard
- Data Sensor
- Action History
- Profile

## Stack

- React 19
- TypeScript
- React Router
- Recharts
- Lucide React

## Run locally

```bash
npm install
npm run dev
```

## Backend integration

This frontend is integrated with your Spring Boot IoT backend:

- REST base URL: `http://localhost:8080`
- WebSocket STOMP endpoint: `ws://localhost:8080/ws`
- Realtime topics:
	- `/topic/sensor`
	- `/topic/device-status`

You can override URLs through Vite env vars:

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
```

### Integrated endpoints

- `POST /api/device/control?led={air_condition|light_bulb|fan}&action={on|off}`
- `POST /api/data-sensor/search?page=0&size=10&sortBy=id&direction=desc`
- `POST /api/action-history/search?page=0&size=10&sortBy=id&direction=desc`

### Notes when testing with BE

- Device names are case-sensitive and must match DB keys (`air_condition`, `light_bulb`, `fan`).
- If API calls return 500, verify MQTT broker connection on port `1884`.
- Dashboard keeps seed data as fallback if backend is temporarily unavailable.

## Build

```bash
npm run build
```

## Notes

- Current data is mocked in `src/data/mockData.ts`.
- The profile avatar and PDF action are placeholders and can be replaced with real assets or API integrations later.