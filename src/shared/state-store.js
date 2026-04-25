import fs from "node:fs/promises";
import path from "node:path";

export function createStateStore(statePath) {
  return {
    async read() {
      try {
        const raw = await fs.readFile(statePath, "utf8");
        return JSON.parse(raw);
      } catch (error) {
        if (error.code === "ENOENT") {
          return {};
        }

        throw error;
      }
    },

    async write(state) {
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    }
  };
}
