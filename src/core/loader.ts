import { readdirSync } from "fs";
import { join, dirname } from "path";
import { pathToFileURL, fileURLToPath } from "url";

export const loadPlugins = () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const plugDir = join(currentDir, "../plugins");
  // const externalPlugDir = join(currentDir, process.env.PLUGINS_DIR || "/external_plugins");

  readdirSync(plugDir)
    .filter((f) => f.endsWith(".ts"))
    .forEach(async (f) => {
      await import(pathToFileURL(join(plugDir, f)).href);
      console.log(`\x1b[32mLoaded plugin:\x1b[0m \x1b[36m${f}\x1b[0m`);
    });

  // readdirSync(externalPlugDir)
  //   .filter(f => f.endsWith(".ts"))
  //   .forEach(f => import(pathToFileURL(join(externalPlugDir, f)).href));
};
