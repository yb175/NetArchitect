/**
 * Runnable VLSM example — reproduces the assignment worked example and
 * demonstrates RFC 3021 special blocks plus a capacity rejection.
 *
 * Usage: npm run example:vlsm
 */
import { allocateVlsm, VlsmRequestError } from "../src/engines/vlsm/index.js";
import { AddressSpaceExhaustedError } from "../src/contracts/errors.js";

const plan = allocateVlsm("192.168.1.0/24", [
  { name: "Engineering", hosts: 100 },
  { name: "Administration", hosts: 50 },
  { name: "Library", hosts: 20 },
]);

console.log("== Worked example: 192.168.1.0/24 ==");
for (const s of plan.subnets) {
  console.log(
    `${s.index + 1}. ${s.name.padEnd(15)} ${String(s.network).padEnd(14)}/${s.prefix}` +
      `  mask ${s.mask.padEnd(15)} wildcard ${s.wildcard.padEnd(14)}` +
      `  ${s.firstHost} … ${s.lastHost}  bcast ${s.broadcast.padEnd(14)}` +
      `  gw ${s.gateway}` +
      `  demand ${s.requestedHosts}/${s.capacity} (${(s.utilization * 100).toFixed(1)}%)`,
  );
}
console.log(`Root-block usable capacity utilization: ${(plan.efficiency * 100).toFixed(2)}%`);

console.log("\n== RFC 3021 special blocks ==");
const p2p = allocateVlsm("10.0.0.0/30", [
  { name: "wan-link-a", hosts: 2 },   // → /30? No: hosts 2 → /31 carve
  { name: "loop-2", hosts: 1 },       // → /32
]);
for (const s of p2p.subnets) {
  console.log(
    `${s.name.padEnd(12)} ${s.network}/${s.prefix}  usable ${s.capacity}  ` +
      `first ${s.firstHost} last ${s.lastHost} bcast ${s.broadcast || "(none per RFC 3021)"} gw ${s.gateway}`,
  );
}

console.log("\n== Capacity rejection (exhaustion) ==");
try {
  allocateVlsm("10.9.0.0/29", [{ name: "too-big", hosts: 500 }]);
} catch (err) {
  if (err instanceof AddressSpaceExhaustedError) {
    console.log(`✔ AddressSpaceExhaustedError → ${err.message}`);
  } else if (err instanceof VlsmRequestError) {
    console.log(`✔ VlsmRequestError → ${err.message}`);
  } else {
    throw err;
  }
}

console.log("\n== Duplicate identifier rejection ==");
try {
  allocateVlsm("192.168.2.0/25", [
    { name: "STAFF-A", hosts: 10 },
    { name: "STAFF-A", hosts: 12 },
  ]);
} catch (err) {
  if (err instanceof VlsmRequestError) console.log(`✔ VlsmRequestError → ${err.message}`);
  else throw err;
}

console.log("\n== Unaligned root rejection ==");
try {
  allocateVlsm("192.168.1.5/24", [{ name: "X", hosts: 4 }]);
} catch (err) {
  if (err instanceof VlsmRequestError) console.log(`✔ VlsmRequestError → ${err.message}`);
  else throw err;
}
