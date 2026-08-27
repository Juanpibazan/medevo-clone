import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

interface AlternativeInput {
  optionLetter: string;
  text: string;
  isCorrect: boolean;
}

interface SubquestionInput {
  letter: string;
  statement: string;
  explanation: string;
}

interface QuestionInput {
  number: string;
  title: string;
  statement: string;
  type: "multiple_choice" | "open_ended";
  explanation: string;
  alternatives: AlternativeInput[];
  metadata: Record<string, unknown>;
  subquestions?: SubquestionInput[];
}

interface TaxonomyNodeOption {
  id: string;
  path: string;
}

// Simple DeepSeek classification function using standard fetch
async function classifyQuestionWithDeepSeek(
  statement: string,
  taxonomyNodesList: TaxonomyNodeOption[],
  apiKey: string,
): Promise<string> {
  // To avoid hitting API rate limits or wasting tokens, truncate statement if too long
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
            content:
              'You are a medical taxonomy classifier. You will be given a medical question and a list of taxonomy nodes. Your job is to select the single most relevant taxonomy ID from the list. Return ONLY a JSON object containing the chosen key \'taxonomyNodeId\' (e.g. {"taxonomyNodeId": "clin-cardio-iam"}). Do not include any explanation or formatting code blocks.',
          },
          {
            role: "user",
            content: `Select the most relevant taxonomy node ID for this question:
Question: "${truncatedStatement}"

Available Taxonomy List:
${JSON.stringify(taxonomyNodesList, null, 2)}

Return JSON format: {"taxonomyNodeId": "chosen_id"}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `API returned status ${response.status} (${response.statusText})`,
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Find the JSON boundaries in case there is conversational or Markdown wrapper text
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in response: " + content);
    }

    const cleanJsonStr = content.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(cleanJsonStr);
    const chosenId = parsed.taxonomyNodeId;

    if (taxonomyNodesList.some((n) => n.id === chosenId)) {
      return chosenId;
    }
    console.log(`⚠️ Classified ID '${chosenId}' not in taxonomy database.`);
  } catch (error) {
    console.error("❌ Failed to classify question via DeepSeek:", error);
  }

  // Default fallback node if API call fails
  return "clin";
}

async function run() {
  const fs = await import("fs");
  const { db } = await import("./client");
  const schema = await import("./schema");
  const { eq } = await import("drizzle-orm");

  const args = process.argv.slice(2);
  const fileArgIdx = args.indexOf("--file");
  const limitArgIdx = args.indexOf("--limit");
  const publishArgIdx = args.indexOf("--publish");

  if (fileArgIdx === -1 || fileArgIdx + 1 >= args.length) {
    console.error(
      "❌ Error: Missing required parameter '--file <path_to_json_file>'",
    );
    process.exit(1);
  }

  const filePath = args[fileArgIdx + 1];
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : null;
  const publish =
    publishArgIdx !== -1 ? args[publishArgIdx + 1] === "true" : true;

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at path: ${filePath}`);
    process.exit(1);
  }

  console.log(`📖 Reading parsed questions from: ${filePath}`);
  const rawData = fs.readFileSync(filePath, "utf-8");
  let questionsList: QuestionInput[] = JSON.parse(rawData);

  if (limit) {
    console.log(`⏱️ Limiting ingestion to first ${limit} questions.`);
    questionsList = questionsList.slice(0, limit);
  }

  console.log(`✨ Loaded ${questionsList.length} questions.`);

  // 1. Fetch all taxonomy nodes
  console.log("🗄️ Fetching taxonomy nodes from DB...");
  const dbNodes = await db.select().from(schema.taxonomyNodes);
  console.log(`Found ${dbNodes.length} taxonomy nodes in database.`);

  const nodeMap = new Map(dbNodes.map((n) => [n.id, n]));
  const getPath = (nodeId: string): string => {
    const parts: string[] = [];
    let curr = nodeMap.get(nodeId);
    while (curr) {
      parts.unshift(curr.name);
      curr = curr.parentId ? nodeMap.get(curr.parentId) : undefined;
    }
    return parts.join(" > ");
  };

  const taxonomyNodesList: TaxonomyNodeOption[] = dbNodes.map((node) => ({
    id: node.id,
    path: getPath(node.id),
  }));

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    console.log(
      "⚠️ DEEPSEEK_API_KEY not found in environment. Fallback to default taxonomy 'clin' (Clínica Médica) for all questions.",
    );
  } else {
    console.log(
      "🔑 DeepSeek API Key loaded successfully for taxonomy classification.",
    );
  }

  // Ensure system editor user exists in DB
  const editorId = "system-editor-id";
  const [editorUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, editorId))
    .limit(1);

  if (!editorUser) {
    console.log("🌱 Creating system editor user...");
    await db
      .insert(schema.users)
      .values({
        id: editorId,
        name: "Dr. Editor MedCiclo",
        email: "editor@medciclo.com",
        emailVerified: true,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.userRoles)
      .values({
        userId: editorId,
        roleCode: "medical_editor",
      })
      .onConflictDoNothing();
  }

  let successCount = 0;

  for (const q of questionsList) {
    console.log(`\nProcessing Questão ${q.number}: "${q.title}"`);

    // Determine Taxonomy Node ID
    let taxonomyNodeId = "clin"; // default fallback
    if (deepseekKey) {
      console.log("🤖 Classifying question via DeepSeek...");
      taxonomyNodeId = await classifyQuestionWithDeepSeek(
        q.statement,
        taxonomyNodesList,
        deepseekKey,
      );
      console.log(
        `📌 Classified as: ${taxonomyNodeId} (${getPath(taxonomyNodeId)})`,
      );
    } else {
      console.log("📌 Using default taxonomy node: clin");
    }

    try {
      const typeSuffix = q.type === "open_ended" ? "dis" : "obj";
      const questionId = `q-revalida-${q.metadata.year || "2011"}-${q.number}-${typeSuffix}`;
      const versionId = `v-revalida-${q.metadata.year || "2011"}-${q.number}-${typeSuffix}-01`;

      console.log(`💾 Ingesting database records (ID: ${questionId})...`);

      await db.transaction(async (tx) => {
        // Insert parent question header
        await tx
          .insert(schema.questions)
          .values({
            id: questionId,
            publishedVersionId: null, // temporarily null
          })
          .onConflictDoNothing();

        // Insert version
        await tx
          .insert(schema.questionVersions)
          .values({
            id: versionId,
            questionId,
            versionNumber: 1,
            status: publish ? "published" : "draft",
            title: q.title,
            statement: q.statement,
            explanation: q.explanation || "",
            taxonomyNodeId,
            type: q.type === "open_ended" ? "open_ended" : "multiple_choice",
            createdBy: editorId,
            subquestions: q.type === "open_ended" ? q.subquestions || [] : null,
          })
          .onConflictDoUpdate({
            target: schema.questionVersions.id,
            set: {
              status: publish ? "published" : "draft",
              title: q.title,
              statement: q.statement,
              explanation: q.explanation || "",
              taxonomyNodeId,
              type: q.type === "open_ended" ? "open_ended" : "multiple_choice",
              subquestions:
                q.type === "open_ended" ? q.subquestions || [] : null,
            },
          });

        // Link parent question to its published version
        if (publish) {
          await tx
            .update(schema.questions)
            .set({ publishedVersionId: versionId, updatedAt: new Date() })
            .where(eq(schema.questions.id, questionId));
        }

        // Insert alternatives if multiple choice
        if (
          q.type === "multiple_choice" &&
          q.alternatives &&
          q.alternatives.length > 0
        ) {
          // Clean options first to avoid duplicates on collision
          await tx
            .delete(schema.questionAlternatives)
            .where(
              eq(schema.questionAlternatives.questionVersionId, versionId),
            );

          for (const alt of q.alternatives) {
            const altId = `alt-revalida-${q.metadata.year || "2011"}-${q.number}-${typeSuffix}-${alt.optionLetter.toLowerCase()}`;
            await tx
              .insert(schema.questionAlternatives)
              .values({
                id: altId,
                questionVersionId: versionId,
                optionLetter: alt.optionLetter,
                text: alt.text,
                isCorrect: alt.isCorrect,
              })
              .onConflictDoNothing();
          }
        }
      });

      console.log(`✅ Ingested Questão ${q.number} successfully!`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to ingest Questão ${q.number}:`, error);
    }
  }

  console.log(
    `\n🎉 Ingestion finished. Successfully imported ${successCount}/${questionsList.length} questions.`,
  );
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Ingestion script failed:", err);
  process.exit(1);
});
