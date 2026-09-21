import { describe, expect, it, vi } from "vitest";
import { PracticeService } from "@/modules/practice/application/practice-service";
import type { PracticeRepository } from "@/modules/practice/application/practice-service";
import type { Question, QuestionVersion } from "@/modules/content";

describe("PracticeService Filtering Unit Tests", () => {
  const mockQuestions = [
    {
      question: {
        id: "q-2021-inep",
        exam: "revalida",
        examYear: 2021,
        institution: "INEP",
        publishedVersionId: "v-2021",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Question,
      activeVersion: {
        id: "v-2021",
        questionId: "q-2021-inep",
        versionNumber: 1,
        status: "published",
        type: "multiple_choice",
        title: "Questão 2021",
        statement: "Enunciado 2021",
        explanation: "Explicação 2021",
        subquestions: null,
        taxonomyNodeId: "node-1",
        createdBy: "user-1",
        createdAt: new Date(),
      } as QuestionVersion,
      alternatives: [],
      images: [],
    },
    {
      question: {
        id: "q-2022-inep",
        exam: "revalida",
        examYear: 2022,
        institution: "INEP",
        publishedVersionId: "v-2022",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Question,
      activeVersion: {
        id: "v-2022",
        questionId: "q-2022-inep",
        versionNumber: 1,
        status: "published",
        type: "multiple_choice",
        title: "Questão 2022",
        statement: "Enunciado 2022",
        explanation: "Explicação 2022",
        subquestions: null,
        taxonomyNodeId: "node-1",
        createdBy: "user-1",
        createdAt: new Date(),
      } as QuestionVersion,
      alternatives: [],
      images: [],
    },
    {
      question: {
        id: "q-2023-usp",
        exam: "revalida",
        examYear: 2023,
        institution: "USP",
        publishedVersionId: "v-2023",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Question,
      activeVersion: {
        id: "v-2023",
        questionId: "q-2023-usp",
        versionNumber: 1,
        status: "published",
        type: "multiple_choice",
        title: "Questão 2023 USP",
        statement: "Enunciado 2023",
        explanation: "Explicação 2023",
        subquestions: null,
        taxonomyNodeId: "node-1",
        createdBy: "user-1",
        createdAt: new Date(),
      } as QuestionVersion,
      alternatives: [],
      images: [],
    },
  ];

  function createTestService() {
    let createdItems: Array<{ questionVersionId: string }> = [];

    const mockRepo: Partial<PracticeRepository> = {
      getUserQuestionStatuses: vi.fn().mockResolvedValue([]),
      createSession: vi.fn().mockImplementation((sessionId, userId, items) => {
        createdItems = items;
        return Promise.resolve({
          id: sessionId,
          userId,
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: null,
        });
      }),
    };

    const mockContentService = {
      getPublishedQuestions: vi.fn().mockResolvedValue(mockQuestions),
      listTaxonomyNodes: vi.fn().mockResolvedValue([]),
      getQuestionVersion: vi.fn().mockResolvedValue(null),
    };

    const service = new PracticeService(
      mockRepo as PracticeRepository,
      mockContentService,
    );

    return { service, getCreatedItems: () => createdItems };
  }

  it("filters questions by specific years", async () => {
    const { service, getCreatedItems } = createTestService();
    await service.createSession("user-1", undefined, {
      years: [2021],
    });

    const items = getCreatedItems();
    expect(items).toHaveLength(1);
    expect(items[0].questionVersionId).toBe("v-2021");
  });

  it("filters questions by multiple years", async () => {
    const { service, getCreatedItems } = createTestService();
    await service.createSession("user-1", undefined, {
      years: [2021, 2022],
    });

    const items = getCreatedItems();
    expect(items).toHaveLength(2);
    const vids = items.map((i) => i.questionVersionId);
    expect(vids).toContain("v-2021");
    expect(vids).toContain("v-2022");
    expect(vids).not.toContain("v-2023");
  });

  it("filters questions by institution", async () => {
    const { service, getCreatedItems } = createTestService();
    await service.createSession("user-1", undefined, {
      institution: "USP",
    });

    const items = getCreatedItems();
    expect(items).toHaveLength(1);
    expect(items[0].questionVersionId).toBe("v-2023");
  });

  it("throws no_questions_for_filters when no questions match the year filter", async () => {
    const { service } = createTestService();
    await expect(
      service.createSession("user-1", undefined, {
        years: [2010],
      }),
    ).rejects.toThrow("no_questions_for_filters");
  });

  it("throws no_questions_for_filters when no questions match the institution filter", async () => {
    const { service } = createTestService();
    await expect(
      service.createSession("user-1", undefined, {
        institution: "NON_EXISTENT",
      }),
    ).rejects.toThrow("no_questions_for_filters");
  });
});
