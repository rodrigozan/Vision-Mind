import { env } from "@vision-mind/shared";
import { decideRoute } from "./router.js";
import { EXAMPLE_SUITE } from "./example-suite.js";

async function main() {
  if (!env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY nao configurada em .env — nao e possivel chamar o Jev real.");
    process.exitCode = 1;
    return;
  }

  let acertos = 0;
  for (const [texto, rotaEsperada] of EXAMPLE_SUITE) {
    const decision = await decideRoute({ text: texto });
    const ok = decision.route === rotaEsperada;
    if (ok) acertos += 1;
    console.log(
      `[${ok ? "ok" : "miss"}] "${texto}" -> esperado=${rotaEsperada} obtido=${decision.route} (${decision.durationMs}ms)`,
    );
  }

  const taxa = ((acertos / EXAMPLE_SUITE.length) * 100).toFixed(1);
  console.log(`\nAcertos: ${acertos}/${EXAMPLE_SUITE.length} (${taxa}%)`);
}

main();
