import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

interface TaxonomyNodeOption {
  id: string;
  path: string;
}

async function classifyQuestionWithDeepSeek(
  statement: string,
  taxonomyNodesList: TaxonomyNodeOption[],
  apiKey: string
): Promise<string> {
  const truncatedStatement = statement.substring(0, 1000);
  
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a medical taxonomy classifier. You will be given a medical question and a list of taxonomy nodes. Your job is to select the single most relevant taxonomy ID from the list. Return ONLY a JSON object containing the chosen key 'taxonomyNodeId' (e.g. {\"taxonomyNodeId\": \"clin-cardio-iam\"}). Do not include any explanation or formatting code blocks."
          },
          {
            role: "user",
            content: `Select the most relevant taxonomy node ID for this question:
Question: "${truncatedStatement}"

Available Taxonomy List:
${JSON.stringify(taxonomyNodesList, null, 2)}

Return JSON format: {"taxonomyNodeId": "chosen_id"}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status} (${response.statusText})`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in response: " + content);
    }
    
    const cleanJsonStr = content.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(cleanJsonStr);
    const chosenId = parsed.taxonomyNodeId;

    if (taxonomyNodesList.some(n => n.id === chosenId)) {
      return chosenId;
    }
    console.log(`⚠️ Classified ID '${chosenId}' not in taxonomy database.`);
  } catch (error) {
    console.error("❌ Failed to classify question via DeepSeek:", error);
  }
  
  return "clin";
}

async function run() {
  const { db } = await import("./client");
  const schema = await import("./schema");
  const { eq, like } = await import("drizzle-orm");

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    console.error("❌ Error: DEEPSEEK_API_KEY not found in environment. Cannot classify questions.");
    process.exit(1);
  }

  console.log("🗄️ Fetching taxonomy nodes from DB...");
  const dbNodes = await db.select().from(schema.taxonomyNodes);
  console.log(`Found ${dbNodes.length} taxonomy nodes in database.`);

  const nodeMap = new Map(dbNodes.map(n => [n.id, n]));
  const getPath = (nodeId: string): string => {
    const parts: string[] = [];
    let curr = nodeMap.get(nodeId);
    while (curr) {
      parts.unshift(curr.name);
      curr = curr.parentId ? nodeMap.get(curr.parentId) : undefined;
    }
    return parts.join(" > ");
  };

  const taxonomyNodesList: TaxonomyNodeOption[] = dbNodes.map(node => ({
    id: node.id,
    path: getPath(node.id),
  }));

  console.log("🔍 Fetching Revalida 2011 question versions from DB...");
  const versions = await db
    .select()
    .from(schema.questionVersions)
    .where(like(schema.questionVersions.questionId, "q-revalida-2011-%"));

  console.log(`Found ${versions.length} question versions to classify.`);

  let updatedCount = 0;

  for (const v of versions) {
    console.log(`\nProcessing: "${v.title}" (Current: ${v.taxonomyNodeId})`);
    
    const newTaxId = await classifyQuestionWithDeepSeek(v.statement, taxonomyNodesList, deepseekKey);
    
    if (newTaxId !== v.taxonomyNodeId) {
      console.log(`🔄 Updating taxonomy: ${v.taxonomyNodeId} ➡️ ${newTaxId} (${getPath(newTaxId)})`);
      await db
        .update(schema.questionVersions)
        .set({ taxonomyNodeId: newTaxId })
        .where(eq(schema.questionVersions.id, v.id));
      updatedCount++;
    } else {
      console.log(`✅ Taxonomy remains the same: ${v.taxonomyNodeId}`);
    }
  }

  console.log(`\n🎉 Classification updates completed! Updated ${updatedCount}/${versions.length} question versions.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Classification script failed:", err);
  process.exit(1);
});
