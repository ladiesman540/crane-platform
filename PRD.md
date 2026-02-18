# Product Requirements Document
## Crane Predictive Maintenance Platform

**Document Type:** Technical PRD
**Version:** 2.0
**Status:** Draft
**Target Release:** Q3 2026

---

## 1. Overview

### 1.1 Problem Statement
Manufacturing facilities lose $260K/hour when overhead cranes fail unexpectedly. Current maintenance is either:
- **Reactive:** Wait for failure (expensive, unplanned downtime)
- **Preventive:** Replace on schedule (wasteful, still misses failures)

### 1.2 Solution
Wireless sensors + cloud platform that predicts crane failures weeks/months before they happen, enabling planned repairs during scheduled downtime.

### 1.3 Success Criteria
- Prevent ≥1 catastrophic failure per customer per year
- Reduce unplanned downtime by 40-60%
- Customer ROI ≥3x within 12 months

---

## 2. User Personas

### 2.1 Primary: Maintenance Manager (Mike)
- Manages 5-20 overhead cranes
- Needs: Know which crane needs attention this week
- Pain: Surprise failures disrupt production schedule
- Tech comfort: Medium (uses CMMS, spreadsheets)

### 2.2 Secondary: Plant Manager (Patricia)
- Responsible for P&L of facility
- Needs: ROI justification, risk mitigation
- Pain: Unplanned downtime costs $50K-$260K/day
- Tech comfort: Low (wants dashboards, not details)

### 2.3 Tertiary: Maintenance Technician (Tom)
- Executes repairs on the floor
- Needs: Clear diagnosis, exact location, recommended action
- Pain: Vague work orders waste time
- Tech comfort: Medium (uses tablets, mobile apps)

---

## 3. Technical Architecture

### 3.1 Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend API | FastAPI (Python 3.11+) | Auto-generated API docs, async support, Python ecosystem for ML/signal processing (scipy, scikit-learn, numpy) |
| Database | Neon Serverless Postgres | Zero-ops, branching for safe migrations, scales with demand |
| Frontend | React + TypeScript + Vite | Interactive charts (FFT zoom/pan), component reuse, large ecosystem |
| Charts | Recharts or Tremor (trend lines), custom WebGL or Plotly (FFT viewer) | Recharts for simple time-series, Plotly for interactive spectrum analysis |
| Real-time | WebSocket via FastAPI | Push new readings and alerts to dashboard instantly |
| Auth | JWT (access + refresh tokens) | Stateless, works with multi-tenant org scoping |
| Gateway bridge | Node-RED flow or small Node.js script using `@ncd-io/node-red-enterprise-sensors` | Parses NCD sensor radio frames, POSTs JSON to our API |

### 3.2 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Customer Facility                                       │
│                                                         │
│  NCD Vibration ──► XBee ──► NCD USB Gateway ──► Pi/PC  │
│  Sensors (x20)     Radio     (receiver)         running │
│                                                Node-RED │
└──────────────────────────────────┬──────────────────────┘
                                   │ HTTP POST JSON
                                   ▼
┌─────────────────────────────────────────────────────────┐
│ Cloud                                                   │
│                                                         │
│  FastAPI Server                                         │
│  ├── POST /api/v1/ingest  (public, API-key auth)       │
│  ├── REST endpoints       (JWT auth)                    │
│  └── WebSocket server     (push to dashboards)          │
│           │                                             │
│           ▼                                             │
│  Neon Postgres                                          │
│  ├── Asset tables    (orgs, facilities, cranes, etc.)  │
│  ├── readings        (time-series, partitioned monthly)│
│  ├── fft_captures    (spectrum stored as binary blob)  │
│  └── alerts          (rules, history, status)          │
│           │                                             │
│           ▼                                             │
│  React Dashboard (static files served via CDN)          │
│  ├── Asset tree sidebar                                 │
│  ├── Trend charts                                       │
│  ├── FFT spectrum viewer                                │
│  └── Alert inbox                                        │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Data Flow

1. NCD sensor wakes up, takes vibration/temperature reading
2. Sensor transmits via XBee radio to USB gateway
3. NCD library (`WirelessGateway.js`) parses radio frames, assembles multi-packet FFT data, emits `sensor_data` event
4. Gateway bridge formats data as JSON, POSTs to `POST /api/v1/ingest`
5. FastAPI validates payload, writes to `readings` table (and `fft_captures` if FFT data present)
6. FastAPI broadcasts new reading via WebSocket to connected dashboards
7. Alert engine evaluates reading against active rules, fires alerts if conditions met

### 3.4 Data Volume & Scaling Strategy

**The math (sensors report every 30 seconds):**

| Scale | Summary readings/month | FFT captures/month (every 5 min) | Total rows/month |
|-------|----------------------|----------------------------------|-----------------|
| 20 sensors (MVP) | 1.7M | 172K | ~1.9M |
| 50 sensors | 4.3M | 432K | ~4.7M |
| 200 sensors | 17.3M | 1.7M | ~19M |

**Phase 1 — MVP (≤20 sensors):**
- Single `readings` table with index on `(sensor_id, timestamp)`
- No partitioning needed. Neon Postgres handles 1.9M rows/month easily
- Store FFT as binary blobs in `fft_captures` table (one row per capture, not one row per frequency bin — this alone prevents a 100x row explosion)

**Phase 2 — Growth (20-50 sensors):**
- Partition `readings` table by month using Postgres native partitioning
- Add nightly rollup job: compute hourly summaries (avg, min, max, rms per metric) into `readings_hourly` table
- Dashboard queries hit `readings_hourly` for anything older than 24 hours, raw `readings` for today
- Drop raw readings older than 90 days, keep hourly summaries indefinitely

**Phase 3 — Scale (50-200+ sensors):**
- Evaluate migration of `readings` and `fft_captures` to TimescaleDB for automatic partitioning, compression, and continuous aggregates
- Asset tables (orgs, facilities, cranes, etc.) stay on Neon Postgres
- FastAPI code change is minimal — different connection string for time-series queries

### 3.5 FFT Storage Strategy

FFT data is the largest data type but the least frequently queried (only when a technician investigates a specific problem).

**Do:** Store each FFT capture as a single row with:
- `sensor_id`, `timestamp`, `axis` (x/y/z)
- `odr` (sample rate in Hz), `num_bins` (number of frequency bins)
- `spectrum_data` — binary column (`BYTEA`) containing the amplitude array as packed floats

**Don't:** Store each frequency/amplitude pair as its own row. At 4096 bins per axis per capture, that would turn 172K captures/month into 2.1B rows/month.

When the user opens the FFT viewer, the API reads the single blob row, deserializes it, and returns a JSON array of `{frequency, amplitude}` pairs.

### 3.6 Gateway Bridge

The gateway bridge is a small piece of code that runs at the customer site (Raspberry Pi or industrial PC) alongside the NCD USB receiver.

**Option A — Node-RED flow (recommended for MVP):**
- Customer installs Node-RED + `@ncd-io/node-red-enterprise-sensors` package
- Flow: NCD Wireless Node → Function Node (format JSON) → HTTP Request Node (POST to our API)
- We provide a pre-built flow file (`.json`) customers can import
- Pros: visual, easy to debug, NCD already supports this
- Cons: requires Node-RED installation

**Option B — Standalone Node.js script:**
- Small script that imports the NCD library, listens for `sensor_data` events, POSTs to our API
- Runs as a systemd service on the Pi
- Pros: lighter weight, no Node-RED dependency
- Cons: less visibility for customer troubleshooting

**Gateway auth:** API key passed in `X-API-Key` header. Each gateway gets a unique key tied to the organization. This is separate from JWT user auth.

---

## 4. Functional Requirements

### 4.1 Priority Definitions
- **P0:** Must have for MVP — launch blocker
- **P1:** Should have — included in v1.0 if time permits
- **P2:** Nice to have — post-launch

---

### FR-001: Sensor Data Ingestion [P0]
**User Story:** As a platform, I need to receive and store sensor readings so they can be analyzed.

**Requirements:**
- Accept HTTP POST from gateway with JSON payload
- Authenticate gateway via API key (`X-API-Key` header)
- Parse NCD Gen4 sensor format (addr, battery, temperature, x/y/z vibration data)
- Store summary readings in `readings` table with server-assigned timestamp
- Store FFT captures in `fft_captures` table as binary blobs
- Handle 100+ readings/minute throughput
- Validate payload schema (reject malformed data with 400 error)

**Acceptance Criteria:**
- [ ] Sensor data appears in database within 5 seconds of transmission
- [ ] Invalid payloads are rejected with descriptive error message
- [ ] Database can store 30 days of readings without performance degradation
- [ ] Duplicate readings (same `counter` + `addr`) are rejected with 409
- [ ] Invalid API key returns 401

---

### FR-002: Asset Management [P0]
**User Story:** As Mike, I need to organize sensors by facility and crane so I know what I'm monitoring.

**Requirements:**
- CRUD operations for: Organizations → Facilities → Cranes → Components → Sensors
- Assign sensors to specific crane components (hoist motor, gearbox, etc.)
- Store bearing specifications (for fault frequency calculations)
- JWT-based authentication for all endpoints
- Org-scoped queries: users only see their organization's data

**Acceptance Criteria:**
- [ ] API supports full CRUD for asset hierarchy
- [ ] Unauthenticated requests return 401
- [ ] Users can only access their organization's data
- [ ] Deleting a parent (crane) cascades to children (sensors) with confirmation

---

### FR-003: Real-Time Dashboard [P0]
**User Story:** As Mike, I need to see current sensor values and trends so I can monitor crane health.

**Requirements:**
- Asset tree sidebar (expandable: Facility → Crane → Component → Sensor)
- Sensor detail page showing latest reading + 24hr/7day/30day trend charts
- Live updates via WebSocket when new readings arrive
- Responsive design (works on tablet in maintenance shop)

**Acceptance Criteria:**
- [ ] Page loads with all assets within 2 seconds
- [ ] Charts render without layout shift
- [ ] New readings update chart within 3 seconds
- [ ] Works on 10" tablet (1024x768)

---

### FR-004: ISO 10816 Classification [P1]
**User Story:** As Mike, I need to know if vibration levels are acceptable per international standards.

**Requirements:**
- Classify velocity readings into Zone A/B/C/D per ISO 10816
- Account for machine type (class I: small motors, class II: medium, etc.)
- Display zone badge (green/blue/yellow/red) on sensor detail page
- Store classification history

**Acceptance Criteria:**
- [ ] Velocity 0.71-1.12 mm/s on medium motor = Zone B (Acceptable)
- [ ] Velocity > 7.1 mm/s on any machine = Zone D (Danger)
- [ ] Zone changes trigger internal event (for alerting)
- [ ] Classification matches ISO 10816-1:1995 tables

---

### FR-005: Alert Engine [P1]
**User Story:** As Mike, I need alerts when something needs attention so I can act quickly.

**Requirements:**
- Configurable alert rules:
  - Threshold-based: velocity > X mm/s
  - Zone-based: ISO zone changes to C or D
  - Trend-based: velocity increased >20% over 7 days
- Multi-channel delivery: SMS (Twilio), Email (SendGrid)
- Alert inbox UI with acknowledge/resolve workflow
- Real-time badge count in navigation

**Acceptance Criteria:**
- [ ] Alert fires within 60 seconds of condition being met
- [ ] SMS delivered within 2 minutes
- [ ] Alert can be acknowledged (stops repeat notifications)
- [ ] Alert history retained for 1 year
- [ ] Duplicate alerts suppressed (same sensor, same condition, <1 hour)

---

### FR-006: Bearing Fault Detection [P1]
**User Story:** As a technician, I need to know exactly which bearing is failing so I can order the right part.

**Requirements:**
- Calculate bearing fault frequencies (BPFO, BPFI, BSF, FTF) from bearing specs
- Analyze FFT spectrum for peaks at fault frequencies +/-2%
- Display fault indicators on FFT chart
- Report confidence level (number of harmonics detected)

**Implementation note:** FFT analysis done server-side in Python using `scipy.fft`. Read the blob from `fft_captures`, deserialize, find peaks at calculated fault frequencies.

**Acceptance Criteria:**
- [ ] SKF 6310 bearing with outer race damage shows BPFO peak at calculated frequency
- [ ] 3+ harmonics detected = High confidence
- [ ] 1 harmonic detected = Low confidence (needs monitoring)
- [ ] Fault diagnosis included in alert message

---

### FR-007: FFT Spectrum Viewer [P1]
**User Story:** As Mike, I need to see the frequency breakdown of vibration to understand what's happening.

**Requirements:**
- Interactive chart showing frequency (Hz) vs amplitude
- Zoom and pan capabilities
- Markers at known fault frequencies (if bearing specs provided)
- Export to CSV/PNG

**Implementation note:** Use Plotly.js for the interactive spectrum chart. Backend deserializes the FFT blob and returns `{frequencies: [...], amplitudes: [...]}` JSON. Plotly handles zoom/pan natively.

**Acceptance Criteria:**
- [ ] Chart renders 0-10,000 Hz spectrum within 2 seconds
- [ ] Zoom maintains resolution (no pixelation)
- [ ] Fault frequency markers labeled with type (BPFO, BPFI, etc.)
- [ ] Export produces usable CSV with frequency/amplitude columns

---

### FR-008: Anomaly Detection (ML) [P2]
**User Story:** As Mike, I want the system to flag unusual readings even if they don't cross standard thresholds.

**Requirements:**
- Per-sensor Isolation Forest model (scikit-learn)
- Train on 200+ "normal" readings (minimum 2 weeks of data)
- Anomaly score 0-100 for each reading
- Configurable threshold for anomaly alert

**Acceptance Criteria:**
- [ ] Model trains in <5 seconds
- [ ] Anomaly score updates with each new reading
- [ ] Score >80 triggers optional alert
- [ ] False positive rate <10% (measured against expert-labeled data)

---

### FR-009: RUL Estimation [P2]
**User Story:** As Patricia, I need to know how much time I have before a repair is needed so I can budget and schedule.

**Requirements:**
- Calculate Remaining Useful Life in operating hours
- Fit exponential degradation curve to velocity trend (numpy/scipy curve_fit)
- Project crossing point of ISO Zone C threshold
- Display RUL chart with confidence interval

**Acceptance Criteria:**
- [ ] RUL calculation requires >=30 days of data
- [ ] Prediction accuracy within +/-20% (validated against historical failures)
- [ ] Chart shows degradation curve + projected path
- [ ] RUL displayed in sensor detail page

---

### FR-010: Operating Hours Tracking [P2]
**User Story:** As Mike, I need accurate operating hours because wear depends on runtime, not calendar time.

**Requirements:**
- Detect "running" state when acceleration >0.05G
- Track cumulative operating hours per crane
- Store run sessions (start time, end time, duration)
- Use operating hours (not calendar) for RUL calculations

**Acceptance Criteria:**
- [ ] Running state detection matches actual crane operation within +/-5%
- [ ] Operating hours accumulate only during "running" periods
- [ ] Session data available via API
- [ ] RUL displays in operating hours with calendar equivalent

---

## 5. Non-Functional Requirements

### 5.1 Performance [P0]
| Metric | Requirement |
|--------|-------------|
| API response time (p95) | <200ms |
| Ingest endpoint throughput | 400+ readings/min (200-sensor headroom) |
| Dashboard initial load | <2 seconds |
| Chart render time | <1 second |
| Alert delivery (sensor to SMS) | <60 seconds |
| Trend query (30 days, single sensor) | <500ms |
| Trend query (30 days, single sensor, using hourly rollups) | <100ms |

### 5.2 Reliability [P0]
- System uptime: 99.5% (excludes planned maintenance)
- Data retention: raw readings 90 days, hourly summaries 2 years, alerts indefinite
- Zero data loss during 1-hour internet outages (gateway buffers locally)

### 5.3 Security [P0]
- All API endpoints require JWT authentication (except ingest, which uses API key)
- Data encrypted in transit (TLS 1.3)
- Passwords hashed with bcrypt (12 rounds)
- SQL injection protection via SQLAlchemy parameterized queries
- API keys hashed in database (not stored in plaintext)

### 5.4 Scalability [P1]
- MVP: 20 sensors, single Neon Postgres instance, no partitioning
- Growth: 50 sensors, monthly partitioning on `readings`, hourly rollup job
- Scale: 200+ sensors, evaluate TimescaleDB migration for time-series tables
- See Section 3.4 for full scaling strategy

### 5.5 Browser Support [P1]
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari/Chrome (iOS 15+, Android 10+)

---

## 6. API Design

### 6.1 REST Endpoints

**Auth**
```
POST   /api/v1/auth/login          → { access_token, refresh_token }
POST   /api/v1/auth/refresh        → { access_token }
```

**Asset Management (all JWT-protected, org-scoped)**
```
GET    /api/v1/organizations
POST   /api/v1/organizations

GET    /api/v1/facilities
POST   /api/v1/facilities
GET    /api/v1/facilities/{id}
PUT    /api/v1/facilities/{id}
DELETE /api/v1/facilities/{id}

GET    /api/v1/cranes
POST   /api/v1/cranes
GET    /api/v1/cranes/{id}
PUT    /api/v1/cranes/{id}
DELETE /api/v1/cranes/{id}

GET    /api/v1/sensors
POST   /api/v1/sensors
GET    /api/v1/sensors/{id}
PUT    /api/v1/sensors/{id}
DELETE /api/v1/sensors/{id}
```

**Data Ingestion (API-key protected)**
```
POST   /api/v1/ingest              ← gateway sends sensor readings here
```

**Readings (JWT-protected)**
```
GET    /api/v1/readings?sensor_id=X&start=T1&end=T2&resolution=raw|hourly
GET    /api/v1/readings/{sensor_id}/latest
```

**Alerts (JWT-protected)**
```
GET    /api/v1/alerts?status=open&severity=critical
POST   /api/v1/alerts/rules
PUT    /api/v1/alerts/rules/{id}
DELETE /api/v1/alerts/rules/{id}
PUT    /api/v1/alerts/{id}/acknowledge
PUT    /api/v1/alerts/{id}/resolve
```

**Analysis (JWT-protected)**
```
GET    /api/v1/analysis/iso-zones/{sensor_id}
GET    /api/v1/analysis/fft/{sensor_id}?timestamp=T
GET    /api/v1/analysis/rul/{sensor_id}
```

### 6.2 WebSocket Events

```
sensor.reading        { sensor_id, timestamp, temperature, x_velocity_mm_sec, ... }
alert.triggered       { alert_id, sensor_id, severity, message }
alert.acknowledged    { alert_id, acknowledged_by }
sensor.status         { sensor_id, status: online|stale|offline }
```

### 6.3 Ingest Payload Schema

```json
{
  "addr": "00:13:A2:00:41:AB:CD:EF",
  "firmware": 10,
  "battery_percent": 87,
  "counter": 45231,
  "sensor_type": 114,
  "mode": 0,
  "odr": 800,
  "temperature": 34.2,
  "x_rms_ACC_G": 0.142,
  "x_max_ACC_G": 0.387,
  "x_velocity_mm_sec": 1.24,
  "x_displacement_mm": 0.008,
  "x_peak_one_Hz": 120.5,
  "x_peak_two_Hz": 241.0,
  "x_peak_three_Hz": 361.5,
  "y_rms_ACC_G": 0.098,
  "y_max_ACC_G": 0.201,
  "y_velocity_mm_sec": 0.87,
  "y_displacement_mm": 0.005,
  "y_peak_one_Hz": 60.0,
  "y_peak_two_Hz": 120.0,
  "y_peak_three_Hz": 180.0,
  "z_rms_ACC_G": 0.054,
  "z_max_ACC_G": 0.112,
  "z_velocity_mm_sec": 0.43,
  "z_displacement_mm": 0.003,
  "z_peak_one_Hz": 60.0,
  "z_peak_two_Hz": 0.0,
  "z_peak_three_Hz": 0.0,
  "rpm": 1750,
  "rssi": -62
}
```

Optional FFT field (present when sensor sends full spectrum):
```json
{
  "...summary fields above...",
  "fft": {
    "axis": "x",
    "odr": 800,
    "num_bins": 4096,
    "data": [0.0012, 0.0015, 0.0089, "...4096 float values..."]
  }
}
```

---

## 7. Database Schema

### 7.1 Asset Tables

```sql
-- Organizations (top-level tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Users belong to an organization
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',  -- admin, manager, viewer
    created_at TIMESTAMPTZ DEFAULT now()
);

-- API keys for gateway authentication
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    key_hash VARCHAR(255) NOT NULL,  -- bcrypt hash, never store plaintext
    label VARCHAR(255),              -- "Factory Floor Pi #1"
    created_at TIMESTAMPTZ DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

-- Facilities (plants/factories)
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cranes within a facility
CREATE TABLE cranes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    crane_type VARCHAR(100),         -- overhead, gantry, jib
    capacity_tons DECIMAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Components on a crane (hoist motor, bridge motor, gearbox, etc.)
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crane_id UUID NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    component_type VARCHAR(100),     -- hoist_motor, bridge_motor, gearbox, trolley_motor
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sensors attached to components
CREATE TABLE sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    mac_address VARCHAR(23) UNIQUE NOT NULL,  -- "00:13:A2:00:41:AB:CD:EF"
    sensor_type INTEGER DEFAULT 114,
    label VARCHAR(255),
    installed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bearing specifications for fault frequency calculation
CREATE TABLE bearing_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    manufacturer VARCHAR(255),       -- SKF, FAG, NSK
    model VARCHAR(100),              -- 6310, 22220
    num_rolling_elements INTEGER,
    rolling_element_diameter_mm DECIMAL,
    pitch_diameter_mm DECIMAL,
    contact_angle_degrees DECIMAL,
    bpfo DECIMAL,                    -- calculated fault frequency ratios
    bpfi DECIMAL,
    bsf DECIMAL,
    ftf DECIMAL
);
```

### 7.2 Time-Series Tables

```sql
-- Summary readings (one row per sensor per transmission)
CREATE TABLE readings (
    id BIGSERIAL,
    sensor_id UUID NOT NULL REFERENCES sensors(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    counter INTEGER,
    firmware INTEGER,
    battery_percent SMALLINT,
    odr INTEGER,
    temperature REAL,
    x_rms_ACC_G REAL,
    x_max_ACC_G REAL,
    x_velocity_mm_sec REAL,
    x_displacement_mm REAL,
    x_peak_one_Hz REAL,
    x_peak_two_Hz REAL,
    x_peak_three_Hz REAL,
    y_rms_ACC_G REAL,
    y_max_ACC_G REAL,
    y_velocity_mm_sec REAL,
    y_displacement_mm REAL,
    y_peak_one_Hz REAL,
    y_peak_two_Hz REAL,
    y_peak_three_Hz REAL,
    z_rms_ACC_G REAL,
    z_max_ACC_G REAL,
    z_velocity_mm_sec REAL,
    z_displacement_mm REAL,
    z_peak_one_Hz REAL,
    z_peak_two_Hz REAL,
    z_peak_three_Hz REAL,
    rpm INTEGER,
    rssi SMALLINT,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create initial monthly partitions (automate via cron)
-- CREATE TABLE readings_2026_07 PARTITION OF readings
--     FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE INDEX idx_readings_sensor_time ON readings (sensor_id, timestamp DESC);
CREATE INDEX idx_readings_time ON readings (timestamp DESC);

-- Unique constraint to reject duplicate transmissions
CREATE UNIQUE INDEX idx_readings_dedup ON readings (sensor_id, counter);

-- FFT captures (one row per spectrum, stored as binary blob)
CREATE TABLE fft_captures (
    id BIGSERIAL PRIMARY KEY,
    sensor_id UUID NOT NULL REFERENCES sensors(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    axis CHAR(1) NOT NULL,           -- 'x', 'y', or 'z'
    odr INTEGER NOT NULL,            -- sample rate (Hz)
    num_bins INTEGER NOT NULL,       -- number of frequency bins
    spectrum_data BYTEA NOT NULL     -- packed float32 array of amplitudes
);

CREATE INDEX idx_fft_sensor_time ON fft_captures (sensor_id, timestamp DESC);

-- Hourly rollups (Phase 2, created by nightly job)
CREATE TABLE readings_hourly (
    sensor_id UUID NOT NULL REFERENCES sensors(id),
    hour TIMESTAMPTZ NOT NULL,
    reading_count INTEGER,
    temperature_avg REAL,
    temperature_max REAL,
    x_rms_ACC_G_avg REAL,
    x_rms_ACC_G_max REAL,
    x_velocity_mm_sec_avg REAL,
    x_velocity_mm_sec_max REAL,
    y_velocity_mm_sec_avg REAL,
    y_velocity_mm_sec_max REAL,
    z_velocity_mm_sec_avg REAL,
    z_velocity_mm_sec_max REAL,
    battery_percent_min SMALLINT,
    PRIMARY KEY (sensor_id, hour)
);
```

### 7.3 Alert Tables

```sql
-- Alert rules (user-configured)
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    sensor_id UUID REFERENCES sensors(id), -- NULL = applies to all sensors in org
    name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL,       -- [{"field": "x_velocity_mm_sec", "operator": ">", "value": 4.5}]
    channels TEXT[] NOT NULL,        -- {'sms', 'email'}
    recipients JSONB NOT NULL,       -- ["user@example.com", "+1234567890"]
    cooldown_minutes INTEGER DEFAULT 60,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert history
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES alert_rules(id),
    sensor_id UUID NOT NULL REFERENCES sensors(id),
    severity VARCHAR(20) NOT NULL,   -- info, warning, critical
    status VARCHAR(20) DEFAULT 'open', -- open, acknowledged, resolved
    message TEXT NOT NULL,
    reading_id BIGINT,               -- the reading that triggered the alert
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_status ON alerts (status, created_at DESC);
CREATE INDEX idx_alerts_sensor ON alerts (sensor_id, created_at DESC);
```

---

## 8. User Interface Requirements

### 8.1 Navigation Structure
```
Dashboard
├── Facilities
│   └── [Facility Name]
│       └── [Crane Name]
│           └── [Component Name]
│               └── [Sensor Name]
│                   ├── Overview (latest values, health score)
│                   ├── Trends (time-series charts)
│                   ├── FFT (spectrum analysis)
│                   └── Settings
├── Alerts (inbox)
├── Reports
└── Settings
    ├── Organization
    ├── Users
    └── Alert Rules
```

### 8.2 Key UI Elements

**Health Score Card:**
- Large number (0-100)
- Color-coded: green (>=80), yellow (50-79), red (<50)
- Trend arrow (up = improving, down = degrading, right = stable)

**Alert Badge:**
- Red dot with count in navigation
- Dropdown preview of latest 3 alerts
- Link to full alert inbox

**Sensor Status Indicator:**
- Green dot: Online (<5 min since last reading)
- Yellow dot: Stale (5-30 min)
- Red dot: Offline (>30 min)

---

## 9. Project Structure

```
crane-platform/
├── api/                         # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, WebSocket
│   │   ├── config.py            # Settings (DB URL, JWT secret, etc.)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── organization.py
│   │   │   ├── facility.py
│   │   │   ├── crane.py
│   │   │   ├── component.py
│   │   │   ├── sensor.py
│   │   │   ├── reading.py
│   │   │   ├── fft_capture.py
│   │   │   ├── alert.py
│   │   │   └── user.py
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── ingest.py
│   │   │   ├── assets.py
│   │   │   ├── readings.py
│   │   │   ├── alerts.py
│   │   │   └── analysis.py
│   │   ├── services/            # Business logic
│   │   │   ├── alert_engine.py
│   │   │   ├── iso_classifier.py
│   │   │   ├── fft_analyzer.py
│   │   │   └── anomaly_detector.py
│   │   ├── schemas/             # Pydantic request/response models
│   │   └── db.py                # Database session management
│   ├── alembic/                 # Database migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── web/                         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/                 # API client (generated from OpenAPI spec)
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── gateway/                     # Gateway bridge
│   ├── node-red-flow.json       # Pre-built Node-RED flow
│   └── standalone.js            # Alternative standalone script
├── PRD.md
└── docker-compose.yml           # Local development
```

---

## 10. Infrastructure & Deployment

### 10.1 MVP Deployment
| Component | Service | Cost estimate |
|-----------|---------|---------------|
| Database | Neon Postgres (free tier to start, then Launch plan) | $0-$19/mo |
| API server | Railway, Render, or Fly.io | $5-$20/mo |
| Frontend | Vercel (static) or same as API | $0 |
| Gateway | Customer-provided Pi/PC | $0 (customer hardware) |

### 10.2 Local Development
- `docker-compose.yml` runs Postgres locally + API + React dev server
- Neon branch for staging/testing migrations
- Seed script generates fake sensor data for development

---

## 11. Open Issues

| Issue | Impact | Status |
|-------|--------|--------|
| Pricing model not defined | Blocks GA release | Under discussion |
| Mobile app vs responsive web | UX decision | Pending user research |
| CMMS integration requirements | Post-MVP feature | Needs customer input |
| Certification requirements (safety) | Compliance | Research needed |
| TimescaleDB migration threshold | When exactly to migrate | Monitor at 50 sensors |

---

## 12. Milestones

| Milestone | Target | Deliverables |
|-----------|--------|--------------|
| M1: Data Pipeline | Week 4 | Neon DB provisioned, schema migrated, ingest endpoint live, asset CRUD API, React dashboard shell with asset tree, gateway bridge tested with real NCD sensor |
| M2: Core Analysis | Week 10 | ISO 10816 classification, alert engine with SMS/email, bearing fault detection, FFT spectrum viewer, hourly rollup job |
| M3: Prediction | Week 16 | Anomaly detection (Isolation Forest), RUL estimation, operating hours tracking |
| M4: Hardening | Week 20 | Security audit, load testing (simulated 200 sensors), tablet optimization, partition automation |
| M5: Beta Launch | Week 24 | 3 pilot customers, feedback collection, monitoring/observability |
| M6: GA Release | Week 30 | Multi-tenant SaaS, billing, marketing site, evaluate TimescaleDB migration |

---

## 13. Appendix

### A. ISO 10816 Zone Thresholds (Class II Machines)

| Zone | Velocity (mm/s) | Action |
|------|-----------------|--------|
| A | < 0.71 | Excellent — no action |
| B | 0.71 - 1.12 | Acceptable — routine monitoring |
| C | 1.12 - 1.8 | Warning — plan maintenance |
| D | > 1.8 | Danger — stop machine |

### B. Data Volume Projections

| Scale | Readings/day | Readings/month | FFT captures/month | Storage/month (est.) |
|-------|-------------|----------------|--------------------|--------------------|
| 20 sensors | 57,600 | 1.7M | 172K | ~2 GB |
| 50 sensors | 144,000 | 4.3M | 432K | ~5 GB |
| 200 sensors | 576,000 | 17.3M | 1.7M | ~20 GB |

### C. Alert Rule Schema

```json
{
  "id": "uuid",
  "name": "Hoist Motor High Vibration",
  "sensor_id": "uuid",
  "conditions": [
    {"field": "x_velocity_mm_sec", "operator": ">", "value": 4.5}
  ],
  "channels": ["sms", "email"],
  "recipients": ["user@example.com", "+1234567890"],
  "cooldown_minutes": 60,
  "enabled": true
}
```

### D. Key Python Dependencies

```
fastapi>=0.109
uvicorn>=0.27
sqlalchemy>=2.0
alembic>=1.13
asyncpg>=0.29
pydantic>=2.5
python-jose>=3.3       # JWT
passlib[bcrypt]>=1.7    # password hashing
scipy>=1.12             # FFT analysis, signal processing
scikit-learn>=1.4       # anomaly detection (Isolation Forest)
numpy>=1.26             # numerical computation
httpx>=0.26             # async HTTP client (for Twilio/SendGrid)
websockets>=12.0
```
