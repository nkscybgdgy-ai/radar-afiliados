import { buildContainer } from "../src/lib/container";

/**
 * Job diário local.
 *   npm run job:daily            roda uma vez e sai
 *   npm run job:daily -- --watch fica rodando e executa 1x por dia (HH:MM de JOB_TIME, padrão 03:00, fuso do servidor)
 */
const watch = process.argv.includes("--watch");
const [hh, mm] = (process.env.JOB_TIME ?? "03:00").split(":").map(Number) as [number, number];

async function runOnce() {
  const c = await buildContainer();
  try {
    const r = await c.snapshotJob.run();
    console.log(`[job] snapshot ${r.day}: ${r.products} produtos`);
  } finally {
    await c.close();
  }
}

if (!watch) {
  await runOnce();
} else {
  console.log(`[job] modo watch: rodando todo dia às ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  let lastDay = "";
  setInterval(async () => {
    const d = new Date();
    const day = d.toISOString().slice(0, 10);
    if (d.getHours() === hh && d.getMinutes() === mm && day !== lastDay) {
      lastDay = day;
      try { await runOnce(); } catch (e) { console.error("[job] erro", e); }
    }
  }, 30_000);
}
