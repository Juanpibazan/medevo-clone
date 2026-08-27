import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const pool = new Pool({
  connectionString:
    process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

const mapping: Record<string, string> = {
  "q-revalida-2011-110": "prev-epidemio-estudos-rr",
  "q-revalida-2011-109": "clin-infectologia-peconhentos-soro",
  "q-revalida-2011-108": "ped-pneumo-tb-conduta",
  "q-revalida-2011-107": "prev-epidemio-estudos-rr",
  "q-revalida-2011-106": "prev-epidemio-indicadores-letalidade",
  "q-revalida-2011-105": "gyn-obst-emergencias-preeclampsia", // overridden
  "q-revalida-2011-104": "gyn-obst-prenatal-vacinas",
  "q-revalida-2011-103": "surg-cp-tireoide-complicacoes",
  "q-revalida-2011-102": "clin-reumatologia-osteoporose-trat",
  "q-revalida-2011-101": "ped-pneumo-asma-crise",
  "q-revalida-2011-100": "gyn-obst-prenatal-diabetes",
  "q-revalida-2011-99": "surg-trauma-toracico-drenagem",
  "q-revalida-2011-98": "gyn-masto-cancer-rastreamento",
  "q-revalida-2011-97": "clin-gastro-cirrose-encefalopatia",
  "q-revalida-2011-96": "prev-epidemio-testes-sensibilidade",
  "q-revalida-2011-95": "prev-epidemio-estudos-coorte",
  "q-revalida-2011-94": "gyn-obst-prenatal-hiv",
  "q-revalida-2011-93": "gyn",
  "q-revalida-2011-92": "surg-abd-obstrucao-conduta",
  "q-revalida-2011-91": "gyn-gineco-onco-colo",
  "q-revalida-2011-90": "gyn-gineco-violencia-conduta",
  "q-revalida-2011-89": "ped-endocrino-crescimento-baixa-estatura",
  "q-revalida-2011-88": "clin-infectologia-ist-sifilis",
  "q-revalida-2011-87": "gyn-obst-parto-conduta",
  "q-revalida-2011-86": "ped-emerg-choque-septico",
  "q-revalida-2011-85": "gyn",
  "q-revalida-2011-84": "ped-gastro-obstrucao-intussuscepcao",
  "q-revalida-2011-83": "surg-trauma-queimadura-cuidados",
  "q-revalida-2011-82": "ped-emerg-choque-septico",
  "q-revalida-2011-81": "clin-nefro-ira-hipercalemia",
  "q-revalida-2011-80": "gyn-obst-parto-conduta",
  "q-revalida-2011-79": "clin-reumatologia-les-nefrite", // overridden
  "q-revalida-2011-78": "gyn",
  "q-revalida-2011-77": "gyn-gineco-onco-colo",
  "q-revalida-2011-76": "surg-orto-trauma-compartimento", // overridden
  "q-revalida-2011-75": "gyn-gineco-onco-colo",
  "q-revalida-2011-74": "ped-nefro-glomerulo-gnrp",
  "q-revalida-2011-73": "ped",
  "q-revalida-2011-72": "ped-pneumo-asma-crise",
  "q-revalida-2011-71": "ped-gastro-diarreia-intolerancia",
  "q-revalida-2011-70": "clin-gastro-peptica-hpylori",
  "q-revalida-2011-69": "ped",
  "q-revalida-2011-68": "ped-emerg-cad-conduta",
  "q-revalida-2011-67": "clin-infectologia-hepatites-sorologia",
  "q-revalida-2011-66": "prev-gestao-esf-territorializacao",
  "q-revalida-2011-65": "surg-abd-hernias-inguinal",
  "q-revalida-2011-64": "clin",
  "q-revalida-2011-63": "clin-cardio",
  "q-revalida-2011-62": "clin-gastro-cirrose-encefalopatia",
  "q-revalida-2011-61": "ped",
  "q-revalida-2011-60": "clin-cardio-iam-conduta",
  "q-revalida-2011-59": "ped-gastro-diarreia-intolerancia",
  "q-revalida-2011-58": "gyn",
  "q-revalida-2011-57": "prev",
  "q-revalida-2011-56": "clin-cardio-iam-conduta",
  "q-revalida-2011-55": "gyn",
  "q-revalida-2011-54": "prev-epidemio-testes-sensibilidade",
  "q-revalida-2011-53": "clin-gastro-cirrose-encefalopatia",
  "q-revalida-2011-52": "surg-abd-inflam-apendicite",
  "q-revalida-2011-51": "surg-abd-inflam",
  "q-revalida-2011-50": "ped",
  "q-revalida-2011-49": "ped",
  "q-revalida-2011-48": "clin-cardio",
  "q-revalida-2011-47": "clin",
  "q-revalida-2011-46": "ped",
  "q-revalida-2011-45": "gyn",
  "q-revalida-2011-44": "surg",
  "q-revalida-2011-43": "clin",
  "q-revalida-2011-42": "surg-abd-inflam-apendicite",
  "q-revalida-2011-41": "clin-cardio",
  "q-revalida-2011-40": "ped",
  "q-revalida-2011-39": "clin-cardio",
  "q-revalida-2011-38": "clin",
  "q-revalida-2011-37": "ped-pneumo-tb-conduta",
  "q-revalida-2011-36": "clin",
  "q-revalida-2011-35": "surg-abd-inflam",
  "q-revalida-2011-34": "ped-pneumo-asma-crise",
  "q-revalida-2011-33": "ped",
  "q-revalida-2011-32": "clin", // overridden
  "q-revalida-2011-31": "clin-cardio-iam-conduta",
  "q-revalida-2011-30": "gyn",
  "q-revalida-2011-29": "ped",
  "q-revalida-2011-28": "ped-neo",
  "q-revalida-2011-27": "ped",
  "q-revalida-2011-26": "surg",
  "q-revalida-2011-25": "clin",
  "q-revalida-2011-24": "clin-cardio-iam-conduta",
  "q-revalida-2011-23": "prev",
  "q-revalida-2011-22": "surg-abd-inflam-diverticulite",
  "q-revalida-2011-21": "clin-cardio",
  "q-revalida-2011-20": "prev",
  "q-revalida-2011-19": "ped",
  "q-revalida-2011-18": "surg-abd-inflam",
  "q-revalida-2011-17": "ped-neo",
  "q-revalida-2011-16": "clin-cardio",
  "q-revalida-2011-15": "ped-neo",
  "q-revalida-2011-14": "surg-abd",
  "q-revalida-2011-13": "prev",
  "q-revalida-2011-12": "ped-neo-reanim-passos",
  "q-revalida-2011-11": "ped",
  "q-revalida-2011-10": "gyn",
  "q-revalida-2011-9": "ped",
  "q-revalida-2011-8": "clin",
  "q-revalida-2011-7": "clin",
  "q-revalida-2011-6": "ped-endocrino-crescimento-baixa-estatura",
  "q-revalida-2011-5": "ped",
  "q-revalida-2011-4": "gyn",
  "q-revalida-2011-3": "gyn-masto-cancer-rastreamento",
  "q-revalida-2011-2": "ped",
  "q-revalida-2011-1": "surg-abd-inflam",
};

async function updateTaxonomy() {
  console.log("Updating taxonomyNodeId for question_versions...");

  let count = 0;
  for (const [questionId, taxonomyNodeId] of Object.entries(mapping)) {
    // We update the questionVersions table where questionId matches
    await db
      .update(schema.questionVersions)
      .set({ taxonomyNodeId })
      .where(eq(schema.questionVersions.questionId, questionId));

    count++;
  }

  console.log(`Successfully updated ${count} question versions.`);
  process.exit(0);
}

updateTaxonomy().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
