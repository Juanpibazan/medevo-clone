import {
  type Alternative,
  type Question,
  type QuestionVersion,
  type TaxonomyNode,
  validateQuestionAlternatives,
} from "../domain/content";

export interface ContentRepository {
  findPublishedQuestions(): Promise<
    Array<{
      question: Question;
      activeVersion: QuestionVersion;
      alternatives: Alternative[];
    }>
  >;
  getQuestionVersion(versionId: string): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
  } | null>;
  getQuestionWithActiveVersion(questionId: string): Promise<{
    question: Question;
    activeVersion: QuestionVersion;
    alternatives: Alternative[];
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
  ): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
  }>;
  listQuestions(): Promise<
    Array<{ question: Question; activeVersion: QuestionVersion | null }>
  >;
  listAllQuestionsWithVersions(): Promise<
    Array<{
      question: Question;
      versions: QuestionVersion[];
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
      alternatives: Array<{
        optionLetter: "A" | "B" | "C" | "D" | "E";
        text: string;
        isCorrect: boolean;
      }>;
    },
  ) {
    const val = validateQuestionAlternatives(input.alternatives);
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
        createdBy: createdByUserId,
      },
      input.alternatives,
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
