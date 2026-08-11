import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Starting database seed...");

  // 1. Seed Roles
  console.log("Seeding roles...");
  await db
    .insert(schema.roles)
    .values([
      { code: "student", description: "Estudante" },
      { code: "medical_editor", description: "Editor Médico" },
      { code: "medical_reviewer", description: "Revisor Médico" },
      { code: "admin", description: "Administrador" },
    ])
    .onConflictDoNothing();

  // 2. Seed System Editor User
  console.log("Seeding system editor user...");
  const editorId = "system-editor-id";
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

  // 3. Seed Taxonomy Nodes
  console.log("Seeding taxonomy...");
  const taxNodes = [
    {
      id: "ped",
      name: "Pediatria",
      level: "specialty" as const,
      parentId: null,
    },
    {
      id: "gyn",
      name: "Ginecologia e Obstetrícia",
      level: "specialty" as const,
      parentId: null,
    },
    {
      id: "clin",
      name: "Clínica Médica",
      level: "specialty" as const,
      parentId: null,
    },
    {
      id: "surg",
      name: "Cirurgia Geral",
      level: "specialty" as const,
      parentId: null,
    },
    {
      id: "prev",
      name: "Medicina de Família e Comunidade / Preventiva",
      level: "specialty" as const,
      parentId: null,
    },

    // Pediatria childs
    {
      id: "ped-neo",
      name: "Neonatologia",
      level: "theme" as const,
      parentId: "ped",
    },
    {
      id: "ped-neo-reanim",
      name: "Reanimação Neonatal",
      level: "focus" as const,
      parentId: "ped-neo",
    },
    {
      id: "ped-neo-reanim-passos",
      name: "Passos Iniciais e Avaliação",
      level: "subfocus" as const,
      parentId: "ped-neo-reanim",
    },

    // Clínica Médica childs
    {
      id: "clin-cardio",
      name: "Cardiologia",
      level: "theme" as const,
      parentId: "clin",
    },
    {
      id: "clin-cardio-iam",
      name: "Infarto Agudo do Miocárdio",
      level: "focus" as const,
      parentId: "clin-cardio",
    },
    {
      id: "clin-cardio-iam-conduta",
      name: "Conduta Inicial e Terapia",
      level: "subfocus" as const,
      parentId: "clin-cardio-iam",
    },

    // Cirurgia Geral childs
    {
      id: "surg-abd",
      name: "Abdome Agudo",
      level: "theme" as const,
      parentId: "surg",
    },
    {
      id: "surg-abd-inflam",
      name: "Abdome Agudo Inflamatório",
      level: "focus" as const,
      parentId: "surg-abd",
    },
    {
      id: "surg-abd-inflam-apendicite",
      name: "Apendicite Aguda",
      level: "subfocus" as const,
      parentId: "surg-abd-inflam",
    },
  ];

  for (const node of taxNodes) {
    await db.insert(schema.taxonomyNodes).values(node).onConflictDoNothing();
  }

  // 4. Seed Questions (at least 12 questions for Revalida)
  console.log("Seeding questions...");

  const questionsData = [
    {
      id: "q-revalida-01",
      taxonomyNodeId: "ped-neo-reanim-passos",
      title: "Reanimação Neonatal em Sala de Parto",
      statement:
        "Recém-nascido a termo, parto vaginal, sem mecônio, apresenta-se hipotônico e com esforço respiratório irregular após o nascimento. Qual deve ser a primeira conduta imediata na mesa de reanimação neonatal?",
      explanation:
        "A primeira conduta imediata no recém-nascido hipotônico ou em apneia/esforço respiratório irregular é prover calor, posicionar a cabeça em leve extensão, aspirar vias aéreas (se necessário/excesso de secreção) e secar (passos iniciais do aquecimento e estabilização de vias aéreas). A ventilação com pressão positiva (VPP) só é iniciada se a frequência cardíaca (FC) for < 100 bpm ou se persistir em apneia após os passos iniciais.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Iniciar ventilação com pressão positiva (VPP) imediatamente.",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "Prover calor, posicionar a cabeça, secar e estimular o recém-nascido.",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Aspirar vias aéreas vigorosamente com sonda traqueal e administrar oxigênio inalatório.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Realizar massagem cardíaca externa imediatamente.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-02",
      taxonomyNodeId: "clin-cardio-iam-conduta",
      title: "Conduta Inicial no IAM com Supra de ST",
      statement:
        "Paciente masculino, 55 anos, chega à emergência com dor precordial típica de forte intensidade iniciada há 2 horas. O eletrocardiograma demonstra supradesnivelamento do segmento ST em parede anterior. O hospital não possui serviço de hemodinâmica (angioplastia primária) e o tempo de transferência estimado para o hospital de referência é de 150 minutos. Qual a conduta imediata indicada?",
      explanation:
        "No IAM com supra de ST, a terapia de reperfusão é obrigatória. A angioplastia coronária primária é a estratégia preferencial se puder ser realizada em até 120 minutos do primeiro contato médico. Se o tempo de transferência estimado ultrapassar 120 minutos (neste caso, 150 minutos), a trombólise química imediata na ausência de contraindicações é a conduta indicada.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Iniciar imediatamente trombólise química com fibrinolítico (ex. Tenecteplase) se não houver contraindicações.",
          isCorrect: true,
        },
        {
          optionLetter: "B",
          text: "Aguardar a transferência para angioplastia primária, independente do tempo.",
          isCorrect: false,
        },
        {
          optionLetter: "C",
          text: "Prescrever apenas dupla antiagregação plaquetária e aguardar melhora dos sintomas.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Encaminhar para cirurgia de revascularização miocárdica de emergência.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-03",
      taxonomyNodeId: "surg-abd-inflam-apendicite",
      title: "Diagnóstico e Conduta na Apendicite Aguda",
      statement:
        "Paciente jovem, 22 anos, apresenta dor abdominal que se iniciou na região periumbilical e migrou para a fossa ilíaca direita há 24 horas, acompanhada de anorexia e febre baixa. Ao exame físico, apresenta sinal de Blumberg positivo. Qual o diagnóstico clínico mais provável e a conduta terapêutica inicial recomendada?",
      explanation:
        "O quadro clínico com dor migratória para a fossa ilíaca direita, anorexia e descompressão dolorosa na fossa ilíaca direita (sinal de Blumberg positivo) é altamente sugestivo de apendicite aguda. Em pacientes jovens masculinos com quadro clássico, o diagnóstico é essencialmente clínico e a conduta é a cirurgia (apendicectomia).",
      alternatives: [
        {
          optionLetter: "A",
          text: "Apendicite aguda; tratamento com antibioticoterapia isolada de amplo espectro.",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "Apendicite aguda; apendicectomia cirúrgica.",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Diverticulite aguda; internação e jejum.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Cistite aguda; tratamento com ciprofloxacino por 3 dias.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-04",
      taxonomyNodeId: "ped-neo-reanim-passos",
      title: "Frequência Cardíaca na Reanimação Neonatal",
      statement:
        "Durante a reanimação de um recém-nascido a termo em sala de parto, após os passos iniciais de estabilização, a frequência cardíaca avaliada pela ausculta do precórdio ou oxímetro de pulso é de 85 batimentos por minuto. Qual a conduta indicada a seguir?",
      explanation:
        "Se a frequência cardíaca (FC) de um recém-nascido estiver abaixo de 100 bpm após os passos iniciais, ou se o paciente mantiver apneia/esforço respiratório irregular, o próximo passo crítico imediato é iniciar a ventilação com pressão positiva (VPP).",
      alternatives: [
        {
          optionLetter: "A",
          text: "Iniciar compressões cardíacas externas na proporção de 3:1.",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "Iniciar ventilação con pressão positiva (VPP) com ar ambiente (oxigênio a 21%).",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Administrar adrenalina por via intravenosa ou endotraqueal.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Apenas observar e manter aquecimento por mais 5 minutos.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-05",
      taxonomyNodeId: "clin-cardio-iam-conduta",
      title: "Dupla Antiagregação Plaquetária no IAM",
      statement:
        "No tratamento inicial do infarto agudo do miocárdio com supradesnivelamento do segmento ST na sala de emergência, qual a combinação de antiagregantes plaquetários recomendada como terapia de primeira linha?",
      explanation:
        "A dupla antiagregação plaquetária (DAPT) inicial consiste na administração de Ácido Acetilsalicílico (AAS) associado a um inibidor do receptor P2Y12 (sendo o Clopidogrel a alternativa mais comum, ou Ticagrelor/Prasugrel se disponíveis e indicados).",
      alternatives: [
        {
          optionLetter: "A",
          text: "AAS associado a um inibidor de P2Y12 (ex. Clopidogrel ou Ticagrelor).",
          isCorrect: true,
        },
        {
          optionLetter: "B",
          text: "AAS isolado, sem necessidade de segundo antiagregante na fase aguda.",
          isCorrect: false,
        },
        {
          optionLetter: "C",
          text: "Clopidogrel associado a varfarina sódica.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Heparina de baixo peso molecular associada a AAS.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-06",
      taxonomyNodeId: "surg-abd-inflam-apendicite",
      title: "Sinal de McBurney na Apendicite",
      statement:
        "No exame físico do abdome de um paciente com suspeita de apendicite aguda, a palpação dolorosa localizada exatamente no ponto médio de uma linha imaginária entre a cicatriz umbilical e a espinha ilíaca anterossuperior direita corresponde a qual sinal semiótico?",
      explanation:
        "A dor localizada à palpação profunda no ponto de McBurney é o achado clássico da apendicite aguda (ponto correspondente à base do apêndice cecal). A dor à descompressão rápida desse mesmo ponto refere-se ao sinal de Blumberg.",
      alternatives: [
        { optionLetter: "A", text: "Sinal de Rovsing", isCorrect: false },
        { optionLetter: "B", text: "Sinal de Murphy", isCorrect: false },
        { optionLetter: "C", text: "Sinal do Psoas", isCorrect: false },
        {
          optionLetter: "D",
          text: "Dor no ponto de McBurney",
          isCorrect: true,
        },
      ],
    },
    {
      id: "q-revalida-07",
      taxonomyNodeId: "ped-neo-reanim-passos",
      title: "Avaliação da Frequência Cardíaca Neonatal",
      statement:
        "Qual é o método padrão-ouro e mais rápido recomendado atualmente pela Sociedade Brasileira de Pediatria para a determinação exata da frequência cardíaca na sala de parto em caso de necessidade de reanimação?",
      explanation:
        "A monitorização eletrocardiográfica (ECG) de 3 vias é recomendada como o método mais rápido e preciso para mensurar a FC durante a reanimação neonatal, embora a ausculta cardíaca precordial e a oximetria de pulso também sejam utilizadas na avaliação inicial.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Ausculta da frequência cardíaca precordial por 60 segundos.",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "Monitorização eletrocardiográfica (ECG) contínua.",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Oximetria de pulso no membro inferior esquerdo.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Palpação do pulso femoral ou carotídeo.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-08",
      taxonomyNodeId: "clin-cardio-iam-conduta",
      title: "Contraindicação Absoluta de Fibrinolíticos",
      statement:
        "Qual das seguintes condições representa uma contraindicação absoluta para o uso de terapia fibrinolítica (trombólise) no paciente com infarto agudo do miocárdio com supra de ST?",
      explanation:
        "Dentre as contraindicações absolutas à trombólise destacam-se: antecedente de acidente vascular cerebral hemorrágico (AVCh) em qualquer momento, AVC isquêmico nos últimos 3 meses, sangramento ativo interno ativo (exceto menstruação), neoplasia intracraniana ou suspeita de dissecção de aorta.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Hipertensão arterial crônica compensada.",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "História de AVC hemorrágico prévio a qualquer tempo.",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Uso concomitante de metformina.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Idade superior a 65 anos.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-09",
      taxonomyNodeId: "surg-abd-inflam-apendicite",
      title: "Apendicite com Bloqueio Apendicular",
      statement:
        "Paciente feminino, 40 anos, com história de dor abdominal na fossa ilíaca direita há 7 dias, agora estável, afebril, com massa palpável dolorosa na fossa ilíaca direita. A tomografia computadorizada revela abscesso localizado de 4 cm no local. Qual a conduta terapêutica inicial mais adequada?",
      explanation:
        "Apendicite aguda de apresentação tardia (geralmente > 5 dias) com plastrão ou abscesso localizado (bloqueio apendicular) deve ser tratada inicialmente de forma conservadora (antibioticoterapia endovenosa e drenagem percutânea do abscesso se viável), seguida de apendicectomia eletiva tardia (de intervalo) se necessário.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Cirurgia imediata com ressecção alargada de cólon (colectomia).",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "Tratamento conservador com antibioticoterapia e drenagem percutânea do abscesso.",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Alta hospitalar e tratamento oral em regime ambulatorial apenas.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Colonoscopia de urgência para descompressão local.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-10",
      taxonomyNodeId: "ped-neo-reanim-passos",
      title: "Oxigenoterapia na Reanimação Neonatal",
      statement:
        "Um recém-nascido pré-termo tardio (35 semanas de idade gestacional) necessita de ventilação com pressão positiva (VPP) na sala de parto. Qual deve ser a concentração inicial de oxigênio recomendada para iniciar a VPP?",
      explanation:
        "Para recém-nascidos com idade gestacional igual ou superior a 34 semanas, a VPP deve ser iniciada com ar ambiente (oxigênio a 21%). Para recém-nascidos menores de 34 semanas, recomenda-se iniciar com oxigênio a 30%.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Oxigênio a 100% imediato.",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "Oxigênio a 21% (ar ambiente).",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Oxigênio a 50% misturado com óxido nítrico.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Oxigênio a 30% inicial.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-11",
      taxonomyNodeId: "clin-cardio-iam-conduta",
      title: "Tratamento de Choque Cardiogênico no IAM",
      statement:
        "Paciente com IAM anterior evolui com hipotensão grave, dispneia, turgência jugular e estertores crepitantes bilaterais até terço médio dos pulmões, caracterizando choque cardiogênico. Qual o vasopressor/inotrópico de escolha na estabilização inicial para melhorar a perfusão tecidual?",
      explanation:
        "Na estabilização inicial do choque cardiogênico, o uso de inotrópicos (Dobutamina) associado a vasopressores (Norepinefrina) é indicado para manter a pressão de perfusão coronariana e sistêmica e melhorar o débito cardíaco.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Norepinefrina e Dobutamina para restaurar perfusão e contratilidade.",
          isCorrect: true,
        },
        {
          optionLetter: "B",
          text: "Nitroprussiato de sódio isolado para reduzir pós-carga.",
          isCorrect: false,
        },
        {
          optionLetter: "C",
          text: "Propranolol intravenoso para reduzir consumo de oxigênio.",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Adrenalina em infusão contínua em altas doses isoladamente.",
          isCorrect: false,
        },
      ],
    },
    {
      id: "q-revalida-12",
      taxonomyNodeId: "surg-abd-inflam-apendicite",
      title: "Diagnóstico Diferencial da Apendicite",
      statement:
        "Uma paciente do sexo feminino, de 25 anos, apresenta dor aguda na fossa ilíaca direita acompanhada de atraso menstrual de 2 semanas. Diante desse quadro clínico, qual exame diagnóstico laboratorial é mandatório para excluir a principal complicação obstétrica diagnóstica diferencial?",
      explanation:
        "Em mulheres em idade fértil com dor abdominal baixa, a gravidez ectópica é um diagnóstico diferencial crítico que deve ser excluído imediatamente. O exame de escolha inicial é a dosagem quantitativa ou qualitativa de beta-hCG.",
      alternatives: [
        {
          optionLetter: "A",
          text: "Hemograma completo com contagem de plaquetas.",
          isCorrect: false,
        },
        {
          optionLetter: "B",
          text: "Dosagem de beta-hCG sanguíneo ou urinário.",
          isCorrect: true,
        },
        {
          optionLetter: "C",
          text: "Sumário de urina (urina tipo 1).",
          isCorrect: false,
        },
        {
          optionLetter: "D",
          text: "Dosagem de amilase e lipase séricas.",
          isCorrect: false,
        },
      ],
    },
  ];

  for (const qData of questionsData) {
    const versionId = `v-${qData.id}-01`;

    // Insert stable question header without publishedVersionId first
    await db
      .insert(schema.questions)
      .values({
        id: qData.id,
        publishedVersionId: null,
      })
      .onConflictDoNothing();

    // Insert version content
    await db
      .insert(schema.questionVersions)
      .values({
        id: versionId,
        questionId: qData.id,
        versionNumber: 1,
        status: "published",
        title: qData.title,
        statement: qData.statement,
        explanation: qData.explanation,
        taxonomyNodeId: qData.taxonomyNodeId,
        createdBy: editorId,
      })
      .onConflictDoNothing();

    // Update publishedVersionId (safeguard)
    await db
      .update(schema.questions)
      .set({ publishedVersionId: versionId })
      .where(eq(schema.questions.id, qData.id));

    // Insert alternatives
    for (const alt of qData.alternatives) {
      const altId = `alt-${qData.id}-${alt.optionLetter.toLowerCase()}`;
      await db
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

  console.log("✅ Database seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
