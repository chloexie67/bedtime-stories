// npm run delete-voice -- <voice_id> [<voice_id> ...]
import { deleteVoice } from "../src/cartesia.js";

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("usage: npm run delete-voice -- <voice_id> ...");
  process.exit(1);
}
for (const id of ids) {
  try {
    await deleteVoice(id);
    console.log(`✓ deleted ${id}`);
  } catch (e) {
    console.error(`✗ ${id}: ${(e as Error).message}`);
  }
}
