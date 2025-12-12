// Node.js script to check database connectivity
// Tests QuestDB, MongoDB, and Redis connections

import { MongoClient } from "mongodb";
import { createClient } from "redis";
import pg from "pg";

const { Client: PgClient } = pg;

const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

console.log(`${BLUE}========================================`);
console.log("Database Connectivity Check");
console.log(`========================================${RESET}\n`);

let allHealthy = true;

// Test QuestDB
console.log(`${YELLOW}🗄️  Testing QuestDB...${RESET}`);
try {
  const questClient = new PgClient({
    host: "localhost",
    port: 8812,
    user: "admin",
    password: "quest",
    database: "qdb",
    connectionTimeoutMillis: 5000,
  });

  await questClient.connect();
  const result = await questClient.query("SELECT 1 as test");

  if (result.rows[0].test === 1) {
    console.log(
      `${GREEN}  ✅ QuestDB connected (PostgreSQL wire protocol)${RESET}`
    );
    console.log(`     Host: localhost:8812`);
  }

  await questClient.end();
} catch (error) {
  console.log(`${RED}  ❌ QuestDB connection failed${RESET}`);
  console.log(`     ${error.message}`);
  allHealthy = false;
}

// Test MongoDB
console.log(`\n${YELLOW}🗄️  Testing MongoDB...${RESET}`);
try {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const mongoClient = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  await mongoClient.connect();
  await mongoClient.db("admin").command({ ping: 1 });

  console.log(`${GREEN}  ✅ MongoDB connected${RESET}`);
  console.log(`     URI: ${mongoUri}`);

  await mongoClient.close();
} catch (error) {
  console.log(`${RED}  ❌ MongoDB connection failed${RESET}`);
  console.log(`     ${error.message}`);
  allHealthy = false;
}

// Test Redis
console.log(`\n${YELLOW}🗄️  Testing Redis...${RESET}`);
try {
  const redisClient = createClient({
    url: "redis://localhost:6379",
    socket: {
      connectTimeout: 5000,
    },
  });

  redisClient.on("error", (err) => {
    throw err;
  });

  await redisClient.connect();
  const pong = await redisClient.ping();

  if (pong === "PONG") {
    console.log(`${GREEN}  ✅ Redis connected${RESET}`);
    console.log(`     URL: redis://localhost:6379`);
  }

  await redisClient.disconnect();
} catch (error) {
  console.log(`${RED}  ❌ Redis connection failed${RESET}`);
  console.log(`     ${error.message}`);
  allHealthy = false;
}

// Summary
console.log(`\n${BLUE}========================================`);
if (allHealthy) {
  console.log(`${GREEN}✅ All databases healthy${RESET}`);
  console.log(`${BLUE}========================================${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}❌ Some databases unhealthy${RESET}`);
  console.log(`${BLUE}========================================${RESET}\n`);
  console.log(`${YELLOW}Run: .\\scripts\\start-databases.ps1${RESET}\n`);
  process.exit(1);
}
