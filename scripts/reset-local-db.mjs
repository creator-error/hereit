import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { cwd } from "node:process";

const databasePath = join(cwd(), ".data", "hereit.sqlite");

mkdirSync(dirname(databasePath), { recursive: true });

if (existsSync(databasePath)) {
  rmSync(databasePath);
  console.log(`removed ${databasePath}`);
} else {
  console.log(`no database found at ${databasePath}`);
}
