# MongoDB Replica Set Configuration

> **Last Updated**: March 17, 2026

## Overview

MongoDB transactions (used by better-auth's `experimental: { joins: true }`) require a **replica set** configuration. This document explains how to set up MongoDB for transaction support.

## Current Configuration

**Default (Development)**: Standalone MongoDB - **NO transactions support**
**Production**: Replica Set - **Transactions enabled**

## Why Replica Sets?

MongoDB transactions are only supported on:

- Replica set members (3+ nodes in production)
- Single-node replica sets (development/testing)
- MongoDB sharded clusters

Standalone MongoDB instances **cannot** use transactions.

---

## Quick Setup (Windows MongoDB Community Server)

**For local MongoDB Community Server installation:**

```powershell
# Run as Administrator
.\scripts\setup-local-mongodb-replica.ps1
```

This script will:

1. ✅ Detect your MongoDB installation path
2. ✅ Backup existing `mongod.cfg` configuration
3. ✅ Create new config with `replication.replSetName: rs0`
4. ✅ Restart MongoDB service
5. ✅ Initialize single-node replica set
6. ✅ Update `.env` with connection string `mongodb://localhost:27017/?replicaSet=rs0`

After running the script, uncomment transactions in [auth.service.ts](../packages/authentication/src/services/auth.service.ts):

```typescript
experimental: { joins: true }, // ✅ Enable this line
```

---

## Setup Options

### Option 1: Development Without Transactions (Current Default)

**Use Case**: Local development, simple authentication flows

**Configuration**:

```typescript
// packages/authentication/src/services/auth.service.ts
adapter: mongodbAdapter(db, {
  client: client,
  // Transactions disabled - works with standalone MongoDB
});
```

**MongoDB Setup**: Standard standalone instance

```yaml
# infrastructure/docker/docker-compose.yml
mongodb:
  image: mongo:7
  ports:
    - "27017:27017"
```

**Pros**:

- Simple setup
- Fast startup
- Lower resource usage

**Cons**:

- No ACID transactions
- better-auth uses fallback logic (multiple separate writes)

---

### Option 2: Single-Node Replica Set (Development with Transactions)

**Use Case**: Testing transaction behavior locally

**Quick Setup**:

```powershell
# Run the setup script
.\scripts\setup-mongodb-replica.ps1
```

**Manual Setup**:

1. **Update docker-compose.yml**:

```yaml
mongodb:
  image: mongo:7
  ports:
    - "27017:27017"
  environment:
    MONGO_REPLICA_SET_NAME: rs0
  command: ["--replSet", "rs0", "--bind_ip_all"]
  volumes:
    - mongo_data:/data/db
```

2. **Start MongoDB**:

```powershell
docker-compose -f infrastructure/docker/docker-compose.yml up -d mongodb
```

3. **Initialize Replica Set**:

```powershell
docker exec mongodb mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [{ _id: 0, host: 'localhost:27017' }]
})"
```

4. **Verify Status**:

```powershell
docker exec mongodb mongosh --eval "rs.status()"
```

5. **Update Connection String**:

```env
# .env
MONGODB_URI=mongodb://localhost:27017/?replicaSet=rs0
```

6. **Enable Transactions in Code**:

```typescript
// packages/authentication/src/services/auth.service.ts
adapter: mongodbAdapter(db, {
  client: client,
  experimental: { joins: true }, // ✅ Enable transactions
});
```

**Pros**:

- ACID transactions
- Better data consistency
- Tests production behavior

**Cons**:

- Slightly higher resource usage
- More complex setup

---

### Option 3: Multi-Node Replica Set (Production)

**Use Case**: Production deployment with high availability

**Configuration** (3 nodes minimum):

```yaml
# docker-compose.production.yml
mongodb-primary:
  image: mongo:7
  command: ["--replSet", "rs0", "--bind_ip_all"]
  environment:
    MONGO_REPLICA_SET_NAME: rs0
  ports:
    - "27017:27017"

mongodb-secondary-1:
  image: mongo:7
  command: ["--replSet", "rs0", "--bind_ip_all"]
  environment:
    MONGO_REPLICA_SET_NAME: rs0
  ports:
    - "27018:27017"

mongodb-secondary-2:
  image: mongo:7
  command: ["--replSet", "rs0", "--bind_ip_all"]
  environment:
    MONGO_REPLICA_SET_NAME: rs0
  ports:
    - "27019:27017"
```

**Initialize**:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-primary:27017" },
    { _id: 1, host: "mongodb-secondary-1:27017" },
    { _id: 2, host: "mongodb-secondary-2:27017" },
  ],
});
```

**Connection String**:

```env
MONGODB_URI=mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/?replicaSet=rs0
```

---

## Verification

### Check Replica Set Status

```powershell
docker exec mongodb mongosh --eval "rs.status()"
```

### Test Transactions

```javascript
// In mongosh
use test
session = db.getMongo().startSession()
session.startTransaction()
session.getDatabase('test').users.insertOne({ name: 'Test' })
session.commitTransaction()
// Should succeed if replica set is configured correctly
```

### Check better-auth Logs

```
✓ No "Transaction numbers are only allowed on a replica set" errors
✓ Successful user creation/authentication
```

---

## Troubleshooting

### Error: "Transaction numbers are only allowed on a replica set"

**Cause**: MongoDB is standalone, but code has `experimental: { joins: true }`

**Solution**:

1. Either disable transactions (remove `experimental: { joins: true }`)
2. Or convert to replica set using Option 2

### Error: "MongoNetworkError: connect ECONNREFUSED"

**Cause**: MongoDB container not running

**Solution**:

```powershell
docker-compose -f infrastructure/docker/docker-compose.yml up -d mongodb
```

### Error: "NotWritablePrimary"

**Cause**: Replica set primary election in progress

**Solution**: Wait 10-30 seconds for election to complete, then retry

### Error: "InvalidReplicaSetConfig"

**Cause**: Incorrect replica set configuration

**Solution**:

```javascript
// In mongosh
rs.reconfig(
  {
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }],
  },
  { force: true }
);
```

---

## Performance Impact

**Standalone MongoDB**:

- Write latency: ~1-5ms
- No replication overhead

**Single-Node Replica Set**:

- Write latency: ~2-8ms (oplog writes)
- Minimal overhead (~10-20% CPU)

**Multi-Node Replica Set**:

- Write latency: ~5-15ms (wait for majority)
- Network overhead for replication

---

## Recommendations

| Environment               | Configuration           | Transactions |
| ------------------------- | ----------------------- | ------------ |
| Local Dev (Windows/Linux) | Standalone              | ❌ Disabled  |
| Local Dev (Testing Auth)  | Single-Node Replica Set | ✅ Enabled   |
| Staging                   | 3-Node Replica Set      | ✅ Enabled   |
| Production                | 3+ Node Replica Set     | ✅ Enabled   |

**Our Choice**:

- **Development**: Standalone (simpler, faster)
- **Production**: Single-node replica set (transactions without multi-node complexity, acceptable for 2-user system)

---

## References

- [MongoDB Replica Set Deployment](https://www.mongodb.com/docs/manual/replication/)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [better-auth MongoDB Adapter](https://www.better-auth.com/docs/adapters/mongo)
- [Docker MongoDB Replica Set](https://github.com/bitnami/containers/tree/main/bitnami/mongodb)
