import type {
  TaxonomyNode,
} from "@/modules/content";

export interface UserMetrics {
  answeredToday: number;
  precisionGlobal: number;
  averageTimeSeconds: number;
  precisionBySpecialty: Array<{
    specialtyId: string;
    specialtyName: string;
    correctCount: number;
    totalCount: number;
    precision: number;
  }>;
}

export interface AnalyticsRepository {
  trackEvent(
    id: string,
    userId: string | null,
    eventType: string,
    properties: Record<string, unknown>,
    createdAt: Date,
  ): Promise<void>;

  getUserResponsesData(userId: string): Promise<
    Array<{
      isCorrect: boolean | null;
      timeTakenSeconds: number;
      verifiedAt: Date | null;
      taxonomyNodeId: string;
    }>
  >;
}

export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly contentService: {
      listTaxonomyNodes(): Promise<TaxonomyNode[]>;
    },
  ) {}

  /**
   * Tracks an event asynchronously and non-blockingly.
   * Catches errors internally to prevent interrupting user actions.
   */
  trackEvent(
    userId: string | null,
    eventType: string,
    properties: Record<string, unknown> = {},
  ): void {
    const id = crypto.randomUUID();
    const createdAt = new Date();

    // Fire-and-forget: do not await this promise
    this.repository
      .trackEvent(id, userId, eventType, properties, createdAt)
      .catch((err) => {
        console.error(
          `[AnalyticsService] Failed to track event ${eventType}:`,
          err,
        );
      });
  }

  /**
   * Calculates metrics for a user in real-time.
   */
  async getUserMetrics(userId: string): Promise<UserMetrics> {
    const responses = await this.repository.getUserResponsesData(userId);
    const allNodes = await this.contentService.listTaxonomyNodes();

    // 1. Calculate today's verified responses in São Paulo timezone (UTC-3)
    const now = new Date();
    const spOffset = -3 * 60 * 60 * 1000; // São Paulo is UTC-3
    const spNow = new Date(now.getTime() + spOffset);
    const startOfTodaySP = new Date(
      Date.UTC(spNow.getUTCFullYear(), spNow.getUTCMonth(), spNow.getUTCDate()),
    );
    const startOfTodayUTC = new Date(startOfTodaySP.getTime() - spOffset);

    const verifiedResponses = responses.filter(
      (r) => r.verifiedAt !== null && r.isCorrect !== null,
    );

    const answeredToday = verifiedResponses.filter(
      (r) => r.verifiedAt! >= startOfTodayUTC,
    ).length;

    // 2. Global precision and average time
    let correctCount = 0;
    let totalTime = 0;

    for (const r of verifiedResponses) {
      if (r.isCorrect) correctCount++;
      totalTime += r.timeTakenSeconds;
    }

    const precisionGlobal =
      verifiedResponses.length > 0
        ? Math.round((correctCount / verifiedResponses.length) * 100)
        : 0;

    const averageTimeSeconds =
      verifiedResponses.length > 0
        ? Math.round(totalTime / verifiedResponses.length)
        : 0;

    // 3. Precision by root specialty
    // Create a map to easily find parent nodes
    const nodeMap = new Map<string, TaxonomyNode>();
    for (const node of allNodes) {
      nodeMap.set(node.id, node);
    }

    // Helper to find root specialty for any taxonomy node
    const getRootSpecialty = (nodeId: string): TaxonomyNode | null => {
      let current = nodeMap.get(nodeId);
      while (current && current.parentId) {
        const parent = nodeMap.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
      return current && current.level === "specialty" ? current : null;
    };

    // Aggregate statistics per specialty
    const specialtyStats = new Map<
      string,
      { name: string; correct: number; total: number }
    >();

    for (const r of verifiedResponses) {
      const rootSpecialty = getRootSpecialty(r.taxonomyNodeId);
      if (rootSpecialty) {
        const stats = specialtyStats.get(rootSpecialty.id) || {
          name: rootSpecialty.name,
          correct: 0,
          total: 0,
        };
        stats.total++;
        if (r.isCorrect) stats.correct++;
        specialtyStats.set(rootSpecialty.id, stats);
      }
    }

    const precisionBySpecialty = Array.from(specialtyStats.entries()).map(
      ([specialtyId, stats]) => ({
        specialtyId,
        specialtyName: stats.name,
        correctCount: stats.correct,
        totalCount: stats.total,
        precision: Math.round((stats.correct / stats.total) * 100),
      }),
    );

    return {
      answeredToday,
      precisionGlobal,
      averageTimeSeconds,
      precisionBySpecialty,
    };
  }
}
