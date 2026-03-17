# Port Allocation Documentation

> **Last Updated**: March 17, 2026

## Overview

This document defines the port allocation strategy for all services in the investment trading portfolio monorepo to prevent conflicts and enable cross-machine communication.

---

## Port Allocation Table

| Service                           | Port(s) | Protocol | Environment | Description                                                       |
| --------------------------------- | ------- | -------- | ----------- | ----------------------------------------------------------------- |
| **Databases**                     |         |          |             |                                                                   |
| QuestDB PostgreSQL Wire           | 8812    | TCP      | Both        | PostgreSQL wire protocol for queries                              |
| QuestDB REST API / Web UI / ILP   | 9000    | HTTP/TCP | Both        | Web console, REST API, and InfluxDB Line Protocol                 |
| QuestDB Min Health Server         | 9003    | HTTP     | Both        | Health check endpoint                                             |
| MongoDB                           | 27017   | TCP      | Both        | MongoDB default port                                              |
| Redis                             | 6379    | TCP      | Both        | Redis default port                                                |
| **Microservices (gRPC)**          |         |          |             |                                                                   |
| Web Dashboard                     | 3000    | HTTP     | Windows     | Next.js frontend (only HTTP service)                              |
| API Server (HTTP)                 | 3004    | HTTP     | Windows     | REST/HTTP API gateway                                             |
| API Server (gRPC)                 | 50050   | gRPC     | Windows     | tRPC + gRPC gateway                                               |
| Algo Worker                       | 50051   | gRPC     | Both        | Main trading engine (inference on Windows, training on ArchLinux) |
| Market Feeder                     | 50052   | gRPC     | Windows     | Real-time market data ingestion                                   |
| Data Processor                    | 50053   | gRPC     | Windows     | ETL and feature engineering                                       |
| Notification Service              | 50054   | gRPC     | Windows     | Alerts and notifications                                          |
| Wealth Analyzer                   | 50055   | gRPC     | Windows     | Portfolio analytics                                               |
| Wealth Management                 | 50056   | gRPC     | Windows     | Portfolio management                                              |
| Document Processor                | 50057   | gRPC     | Windows     | Document parsing and indexing                                     |
| **Monitoring**                    |         |          |             |                                                                   |
| PM2 Web Monit                     | 9615    | HTTP     | Both        | PM2 process monitoring dashboard                                  |
| Prometheus                        | 9090    | HTTP     | Both        | Metrics collection                                                |
| Grafana                           | 3005    | HTTP     | Both        | Metrics visualization                                             |
| **Development Tools**             |         |          |             |                                                                   |
| VS Code Debugger - Algo Worker    | 9229    | TCP      | Both        | Node.js debugging                                                 |
| VS Code Debugger - Market Feeder  | 9230    | TCP      | Windows     | Node.js debugging                                                 |
| VS Code Debugger - Data Processor | 9231    | TCP      | Windows     | Node.js debugging                                                 |
| VS Code Debugger - API            | 9232    | TCP      | Windows     | Node.js debugging                                                 |
| VS Code Debugger - Web            | 9233    | TCP      | Windows     | Node.js debugging                                                 |
| VS Code Debugger - Doc Processor  | 9234    | TCP      | Windows     | Node.js debugging                                                 |
| Python Debugpy                    | 5678    | TCP      | ArchLinux   | Python ML training debugging                                      |
| **Data Science Tools**            |         |          |             |                                                                   |
| Kedro Viz                         | 4141    | HTTP     | ArchLinux   | Pipeline visualization                                            |
| MLflow                            | 5000    | HTTP     | ArchLinux   | Experiment tracking UI                                            |

---

## Port Ranges

- **3000**: Web frontend (Next.js - only HTTP service)
- **50050-50099**: gRPC microservices
- **5678**: Python debugger (debugpy)
- **8000-8999**: Database auxiliary ports
- **9000-9999**: Monitoring, admin UIs, and management

---

## Cross-Machine Access

### Windows → ArchLinux

- **QuestDB (ArchLinux)**: Accessible via `ARCHLINUX_IP:8812` for historical data queries during training
- **MongoDB (ArchLinux)**: Accessible via `ARCHLINUX_IP:27017` for model metadata storage
- **SSH**: Port 22 for rsync and remote commands

### ArchLinux → Windows

- **QuestDB (Windows)**: Accessible via `WINDOWS_IP:8812` for real-time market data
- **MongoDB (Windows)**: Accessible via `WINDOWS_IP:27017` for trading signals and orders
- **Redis (Windows)**: Accessible via `WINDOWS_IP:6379` for real-time state
- **Algo Worker API (Windows)**: `WINDOWS_IP:3001` for triggering model reloads

---

## Firewall Configuration

### Windows Firewall Rules

```powershell
# Allow inbound on trading ports
New-NetFirewallRule -DisplayName "QuestDB PostgreSQL" -Direction Inbound -LocalPort 8812 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "QuestDB Web UI" -Direction Inbound -LocalPort 9000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "MongoDB" -Direction Inbound -LocalPort 27017 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Redis" -Direction Inbound -LocalPort 6379 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Algo Worker" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Allow specific IP (ArchLinux machine)
Set-NetFirewallRule -DisplayName "QuestDB PostgreSQL" -RemoteAddress ARCHLINUX_IP
Set-NetFirewallRule -DisplayName "MongoDB" -RemoteAddress ARCHLINUX_IP
```

### Linux iptables/firewalld

```bash
# ArchLinux firewall rules
sudo firewall-cmd --permanent --add-port=8812/tcp  # QuestDB
sudo firewall-cmd --permanent --add-port=9000/tcp  # QuestDB UI
sudo firewall-cmd --permanent --add-port=27017/tcp # MongoDB
sudo firewall-cmd --permanent --add-port=22/tcp    # SSH
sudo firewall-cmd --reload

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 8812 -s WINDOWS_IP -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 27017 -s WINDOWS_IP -j ACCEPT
```

---

## Port Conflict Detection

Run the port checker before starting services:

```powershell
# Windows
.\scripts\check-ports.ps1

# Linux
bash ./scripts/check-ports.sh
```

This script will:

- Test each port for availability
- Identify processes using blocked ports
- Suggest alternatives if conflicts exist
- Exit with error code 1 if critical ports are blocked

---

## Killing Processes on Ports

```powershell
# Windows - Kill process on port
.\scripts\kill-port.ps1 -Port 3001

# Linux - Kill process on port
sudo fuser -k 3001/tcp
```

---

## Environment Variables

All ports should be configurable via environment variables:

```bash
# .env
PORT=3001
QUESTDB_PG_PORT=8812
QUESTDB_HTTP_PORT=9000
QUESTDB_ILP_PORT=9000
MONGODB_PORT=27017
REDIS_PORT=6379
PM2_WEB_PORT=9615
DEBUG_PORT=9229
```

---

## Verification Commands

### Check if Port is Open

```powershell
# Windows
Test-NetConnection -ComputerName localhost -Port 3001

# Linux
nc -zv localhost 3001
```

### List All Listening Ports

```powershell
# Windows
Get-NetTCPConnection | Where-Object {$_.State -eq "Listen"} | Select-Object LocalPort, OwningProcess

# Linux
sudo ss -tulnp | grep LISTEN
```

---

## Troubleshooting

### Port Already in Use

1. Identify the process: `netstat -ano | findstr :3001` (Windows) or `lsof -i :3001` (Linux)
2. Kill the process: `taskkill /PID <PID> /F` (Windows) or `kill -9 <PID>` (Linux)
3. Or use the provided `kill-port` script

### Cannot Connect Across Machines

1. Verify firewall rules are active
2. Check database bind address (should be `0.0.0.0` not `127.0.0.1`)
3. Test connectivity: `telnet REMOTE_IP PORT`
4. Check network ACLs and router settings

### Port Exhaustion

If running many services, you may hit port limits:

- Windows default ephemeral port range: 49152-65535
- Increase range: `netsh int ipv4 set dynamicport tcp start=10000 num=55535`

---

## Future Additions

As new services are added, allocate ports from these reserved ranges:

- **3100-3199**: Future application services
- **9100-9199**: Future monitoring tools
- **9300-9399**: Future debug ports
