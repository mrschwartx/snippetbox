import { rmSync } from "node:fs";

const path = process.env.DATABASE_PATH;

if (path) {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(path + suffix, { force: true });
  }
}
