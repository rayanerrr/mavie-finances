import { db } from "../src/db";
import { seedCore } from "../src/db/seed-core";
seedCore(db.$client);
console.log("Seed OK — comptes, catégories et réglages.");
