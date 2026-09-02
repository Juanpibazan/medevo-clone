import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BackofficeQuestionList,
  type QuestionWithVersions,
} from "@/app/[locale]/(student)/app/backoffice/backoffice-question-list";
import type { TaxonomyNode } from "@/modules/content";

const { replace } = vi.hoisted(() => ({
  replace: vi.fn(),
}));

let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children?: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/es/app/backoffice",
  useRouter: () => ({ replace }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (values && key === "resultsCount") {
      return `Mostrando ${values.filtered} de ${values.total} preguntas`;
    }
    return key;
  },
}));

const mockTaxonomyNodes: TaxonomyNode[] = [
  {
    id: "spec-1",
    parentId: null,
    name: "Clínica Médica",
    level: "specialty",
    createdAt: new Date(),
  },
  {
    id: "theme-1",
    parentId: "spec-1",
    name: "Cardiologia",
    level: "theme",
    createdAt: new Date(),
  },
  {
    id: "focus-1",
    parentId: "theme-1",
    name: "Hipertensão",
    level: "focus",
    createdAt: new Date(),
  },
  {
    id: "spec-2",
    parentId: null,
    name: "Cirurgia",
    level: "specialty",
    createdAt: new Date(),
  },
];

const mockQuestions: QuestionWithVersions[] = [
  {
    question: {
      id: "q-101",
      publishedVersionId: "v-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    versions: [
      {
        id: "v-1",
        questionId: "q-101",
        versionNumber: 1,
        status: "published",
        type: "multiple_choice",
        title: "Tratamento da Hipertensão Arterial Resistente",
        statement: "Enunciado da questão 1",
        explanation: "Explicação canônica",
        subquestions: null,
        taxonomyNodeId: "focus-1",
        createdBy: "user-1",
        createdAt: new Date(),
        images: [],
      },
    ],
  },
  {
    question: {
      id: "q-202",
      publishedVersionId: "v-2",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    versions: [
      {
        id: "v-2",
        questionId: "q-202",
        versionNumber: 1,
        status: "published",
        type: "open_ended",
        title: "Conduta no Abdome Agudo Perfurativo",
        statement: "Enunciado da questão discursiva",
        explanation: "Explicação",
        subquestions: [
          { letter: "A", statement: "Conduta", explanation: "Explicacao" },
        ],
        taxonomyNodeId: "spec-2",
        createdBy: "user-1",
        createdAt: new Date(),
        images: [],
      },
    ],
  },
];

describe("BackofficeQuestionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
  });

  it("renders questions and filter controls properly", () => {
    render(
      <BackofficeQuestionList
        initialQuestions={mockQuestions}
        taxonomyNodes={mockTaxonomyNodes}
        locale="es"
        isEditor={true}
        isReviewer={true}
      />,
    );

    expect(screen.getByText("Tratamento da Hipertensão Arterial Resistente")).toBeInTheDocument();
    expect(screen.getByText("Conduta no Abdome Agudo Perfurativo")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 2 de 2 preguntas")).toBeInTheDocument();
  });

  it("filters questions by search query (title and id)", async () => {
    const user = userEvent.setup();
    render(
      <BackofficeQuestionList
        initialQuestions={mockQuestions}
        taxonomyNodes={mockTaxonomyNodes}
        locale="es"
        isEditor={true}
        isReviewer={true}
      />,
    );

    const input = screen.getByPlaceholderText("searchPlaceholder");
    await user.type(input, "Hipertens");

    expect(screen.getByText("Tratamento da Hipertensão Arterial Resistente")).toBeInTheDocument();
    expect(screen.queryByText("Conduta no Abdome Agudo Perfurativo")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 de 2 preguntas")).toBeInTheDocument();

    // Clear and search by ID
    await user.clear(input);
    await user.type(input, "202");
    expect(screen.queryByText("Tratamento da Hipertensão Arterial Resistente")).not.toBeInTheDocument();
    expect(screen.getByText("Conduta no Abdome Agudo Perfurativo")).toBeInTheDocument();
  });

  it("filters questions by question type tabs", async () => {
    const user = userEvent.setup();
    render(
      <BackofficeQuestionList
        initialQuestions={mockQuestions}
        taxonomyNodes={mockTaxonomyNodes}
        locale="es"
        isEditor={true}
        isReviewer={true}
      />,
    );

    await user.click(screen.getByText("filterTypeOpenEnded"));
    expect(screen.queryByText("Tratamento da Hipertensão Arterial Resistente")).not.toBeInTheDocument();
    expect(screen.getByText("Conduta no Abdome Agudo Perfurativo")).toBeInTheDocument();

    await user.click(screen.getByText("filterTypeMultipleChoice"));
    expect(screen.getByText("Tratamento da Hipertensão Arterial Resistente")).toBeInTheDocument();
    expect(screen.queryByText("Conduta no Abdome Agudo Perfurativo")).not.toBeInTheDocument();
  });

  it("filters questions by hierarchical taxonomy (including descendants)", async () => {
    const user = userEvent.setup();
    render(
      <BackofficeQuestionList
        initialQuestions={mockQuestions}
        taxonomyNodes={mockTaxonomyNodes}
        locale="es"
        isEditor={true}
        isReviewer={true}
      />,
    );

    // Select "Clínica Médica" specialty (q-101 has focus-1 which is child of theme-1 child of spec-1)
    const specialtySelect = screen.getByRole("combobox", { name: "specialty" });
    await user.selectOptions(specialtySelect, "spec-1");

    expect(screen.getByText("Tratamento da Hipertensão Arterial Resistente")).toBeInTheDocument();
    expect(screen.queryByText("Conduta no Abdome Agudo Perfurativo")).not.toBeInTheDocument();

    // Select "Cirurgia" specialty
    await user.selectOptions(specialtySelect, "spec-2");
    expect(screen.queryByText("Tratamento da Hipertensão Arterial Resistente")).not.toBeInTheDocument();
    expect(screen.getByText("Conduta no Abdome Agudo Perfurativo")).toBeInTheDocument();
  });

  it("shows empty state and allows resetting filters", async () => {
    const user = userEvent.setup();
    render(
      <BackofficeQuestionList
        initialQuestions={mockQuestions}
        taxonomyNodes={mockTaxonomyNodes}
        locale="es"
        isEditor={true}
        isReviewer={true}
      />,
    );

    const input = screen.getByPlaceholderText("searchPlaceholder");
    await user.type(input, "inexistente_12345");

    expect(screen.getByText("noResultsFound")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 0 de 2 preguntas")).toBeInTheDocument();

    // Click reset
    const clearBtns = screen.getAllByRole("button", { name: "clearFilters" });
    await user.click(clearBtns[0]);

    expect(screen.getByText("Tratamento da Hipertensão Arterial Resistente")).toBeInTheDocument();
    expect(screen.getByText("Conduta no Abdome Agudo Perfurativo")).toBeInTheDocument();
  });
});
