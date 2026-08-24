import {
  type Alternative,
  type Question,
  type QuestionVersion,
  type TaxonomyNode,
  type QuestionImage,
  type QuestionType,
  validateQuestionAlternatives,
} from "../domain/content";

export interface ContentRepository {
  findPublishedQuestions(): Promise<
    Array<{
      question: Question;
      activeVersion: QuestionVersion;
      alternatives: Alternative[];
      images: QuestionImage[];
    }>
  >;
  getQuestionVersion(versionId: string): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
    images: QuestionImage[];
  } | null>;
  getQuestionWithActiveVersion(questionId: string): Promise<{
    question: Question;
    activeVersion: QuestionVersion;
    alternatives: Alternative[];
    images: QuestionImage[];
  } | null>;
  createQuestionWithVersion(
    questionId: string,
    versionId: string,
    versionInput: Omit<
      QuestionVersion,
      "id" | "questionId" | "versionNumber" | "status" | "createdAt"
    >,
    alternativesInput: Array<
      Omit<Alternative, "id" | "questionVersionId" | "createdAt">
    >,
    imagesInput?: Array<{ url: string; position: number }>,
  ): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
    images: QuestionImage[];
  }>;
  listQuestions(): Promise<
    Array<{ question: Question; activeVersion: QuestionVersion | null }>
  >;
  listAllQuestionsWithVersions(): Promise<
    Array<{
      question: Question;
      versions: Array<QuestionVersion & { images: QuestionImage[] }>;
    }>
  >;
  listTaxonomyNodes(): Promise<TaxonomyNode[]>;
  getTaxonomyAncestors(nodeId: string): Promise<TaxonomyNode[]>;
}

export class ContentService {
  constructor(private readonly repository: ContentRepository) {}

  async getPublishedQuestions() {
    return this.repository.findPublishedQuestions();
  }

  async getQuestionVersion(versionId: string) {
    return this.repository.getQuestionVersion(versionId);
  }

  async getQuestionWithActiveVersion(questionId: string) {
    return this.repository.getQuestionWithActiveVersion(questionId);
  }

  async createQuestion(
    createdByUserId: string,
    input: {
      title: string;
      statement: string;
      explanation: string;
      taxonomyNodeId: string;
      type?: QuestionType;
      alternatives: Array<{
        optionLetter: "A" | "B" | "C" | "D" | "E";
        text: string;
        isCorrect: boolean;
      }>;
      images?: Array<{ url: string; position: number }>;
    },
  ) {
    const qType = input.type ?? "multiple_choice";
    const val = validateQuestionAlternatives(input.alternatives, qType);
    if (!val.success) {
      throw new Error(`Invalid alternatives configuration: ${val.code}`);
    }

    const questionId = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    return this.repository.createQuestionWithVersion(
      questionId,
      versionId,
      {
        title: input.title,
        statement: input.statement,
        explanation: input.explanation,
        taxonomyNodeId: input.taxonomyNodeId,
        type: qType,
        createdBy: createdByUserId,
      },
      input.alternatives,
      input.images,
    );
  }

  async listQuestions() {
    return this.repository.listQuestions();
  }

  async listAllQuestionsWithVersions() {
    return this.repository.listAllQuestionsWithVersions();
  }

  async listTaxonomyNodes() {
    return this.repository.listTaxonomyNodes();
  }

  async getTaxonomyAncestors(nodeId: string) {
    return this.repository.getTaxonomyAncestors(nodeId);
  }
}
