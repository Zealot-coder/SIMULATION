/**
 * Local seed script (node) for creating minimal mock data for dashboard development.
 * Run: `node ./scripts/seed_mock_data.ts` after `ts-node` setup or compile to JS.
 *
 * NOTE: This script is a template. Replace fetch endpoints with your backend or Supabase client.
 */

// node-fetch is optional for Node <18. If missing, use global fetch in Node 18+
// @ts-ignore
import fetch from "node-fetch";

async function run() {
  console.log("Seeding mock data... (this is a template script)");
  // For example, create an organization, a user, and an event
  // Replace endpoints below with your backend API
  try {
    // create org
    // await fetch("http://localhost:3001/api/v1/organizations", { method: "POST", body: JSON.stringify({ name: "Demo Org" }) });
    console.log("Mock data created (placeholder). Configure this script to call your backend or supabase directly.");
  } catch (err) {
    console.error("seed error", err);
  }
}

run().catch(console.error);
