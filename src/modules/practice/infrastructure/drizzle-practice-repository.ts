import { eq, and, asc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { studySessions, studySessionItems, responses } from "@/db/schema";
import type { PracticeRepository } from "../application/practice-service";
import type {
  Response,
  StudySession,
  StudySessionItem,
  SessionStatus,
  MetacognitiveMark,
} from "../domain/practice";

export class DrizzlePracticeRepository implements PracticeRepository {
  async createSession(
    sessionId: string,
    userId: string,
    items: Array<{ id: string; questionVersionId: string; position: number }>,
  ): Promise<StudySession> {
    return db.transaction(async (tx) => {
      const now = new Date();

      await tx.insert(studySessions).values({
        id: sessionId,
        userId,
        status: "in_progress",
        createdAt: now,
      });

      const itemsToInsert = items.map((item) => ({
        id: item.id,
        sessionId,
        questionVersionId: item.questionVersionId,
        position: item.position,
        createdAt: now,
      }));

      await tx.insert(studySessionItems).values(itemsToInsert);

      const [row] = await tx
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, sessionId))
        .limit(1);

      return {
        id: row.id,
        userId: row.userId,
        status: row.status as SessionStatus,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
      };
    });
  }

  async getSession(
    sessionId: string,
    userId: string,
  ): Promise<{
    session: StudySession;
    items: Array<
      StudySessionItem & {
        questionVersionId: string;
        response: Response | null;
      }
    >;
  } | null> {
    const [sess] = await db
      .select()
      .from(studySessions)
      .where(
        and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)),
      )
      .limit(1);

    if (!sess) return null;

    const items = await db
      .select()
      .from(studySessionItems)
      .where(eq(studySessionItems.sessionId, sessionId))
      .orderBy(asc(studySessionItems.position));

    if (items.length === 0) {
      return {
        session: {
          id: sess.id,
          userId: sess.userId,
          status: sess.status as SessionStatus,
          createdAt: sess.createdAt,
          completedAt: sess.completedAt,
        },
        items: [],
      };
    }

    const itemIds = items.map((it) => it.id);
    const resps = await db
      .select()
      .from(responses)
      .where(inArray(responses.sessionItemId, itemIds))
      .orderBy(asc(responses.createdAt));

    const mappedItems = items.map((item) => {
      const resp = resps.find((r) => r.sessionItemId === item.id) || null;
      return {
        id: item.id,
        sessionId: item.sessionId,
        questionVersionId: item.questionVersionId,
        position: item.position,
        createdAt: item.createdAt,
        response: resp
          ? {
              id: resp.id,
              sessionItemId: resp.sessionItemId,
              selectedAlternativeId: resp.selectedAlternativeId,
              isCorrect: resp.isCorrect,
              timeTakenSeconds: resp.timeTakenSeconds,
              metacognitiveMark:
                resp.metacognitiveMark as MetacognitiveMark | null,
              isFavorite: resp.isFavorite,
              verifiedAt: resp.verifiedAt,
              createdAt: resp.createdAt,
              updatedAt: resp.updatedAt,
            }
          : null,
      };
    });

    return {
      session: {
        id: sess.id,
        userId: sess.userId,
        status: sess.status as SessionStatus,
        createdAt: sess.createdAt,
        completedAt: sess.completedAt,
      },
      items: mappedItems,
    };
  }

  async saveResponse(
    responseId: string,
    sessionItemId: string,
    patch: Partial<Response>,
  ): Promise<Response> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(responses)
        .where(eq(responses.sessionItemId, sessionItemId))
        .limit(1);

      const now = new Date();

      if (existing) {
        // Update
        const valuesToSet: Partial<typeof responses.$inferInsert> = {
          updatedAt: now,
        };
        if (patch.selectedAlternativeId !== undefined) {
          valuesToSet.selectedAlternativeId = patch.selectedAlternativeId;
        }
        if (patch.isCorrect !== undefined) {
          valuesToSet.isCorrect = patch.isCorrect;
        }
        if (patch.timeTakenSeconds !== undefined) {
          valuesToSet.timeTakenSeconds = patch.timeTakenSeconds;
        }
        if (patch.metacognitiveMark !== undefined) {
          valuesToSet.metacognitiveMark = patch.metacognitiveMark;
        }
        if (patch.isFavorite !== undefined) {
          valuesToSet.isFavorite = patch.isFavorite;
        }
        if (patch.verifiedAt !== undefined) {
          valuesToSet.verifiedAt = patch.verifiedAt;
        }

        await tx
          .update(responses)
          .set(valuesToSet)
          .where(eq(responses.id, existing.id));
      } else {
        // Insert
        await tx.insert(responses).values({
          id: responseId,
          sessionItemId,
          selectedAlternativeId: patch.selectedAlternativeId || null,
          isCorrect: patch.isCorrect !== undefined ? patch.isCorrect : null,
          timeTakenSeconds: patch.timeTakenSeconds || 0,
          metacognitiveMark: patch.metacognitiveMark || null,
          isFavorite: patch.isFavorite || false,
          verifiedAt: patch.verifiedAt || null,
          createdAt: now,
          updatedAt: now,
        });
      }

      const [row] = await tx
        .select()
        .from(responses)
        .where(eq(responses.sessionItemId, sessionItemId))
        .limit(1);

      return {
        id: row.id,
        sessionItemId: row.sessionItemId,
        selectedAlternativeId: row.selectedAlternativeId,
        isCorrect: row.isCorrect,
        timeTakenSeconds: row.timeTakenSeconds,
        metacognitiveMark: row.metacognitiveMark as MetacognitiveMark | null,
        isFavorite: row.isFavorite,
        verifiedAt: row.verifiedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  }

  async finishSession(sessionId: string): Promise<StudySession> {
    await db
      .update(studySessions)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(studySessions.id, sessionId));

    const [sess] = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, sessionId))
      .limit(1);

    return {
      id: sess.id,
      userId: sess.userId,
      status: sess.status as SessionStatus,
      createdAt: sess.createdAt,
      completedAt: sess.completedAt,
    };
  }

  async getActiveSession(userId: string): Promise<StudySession | null> {
    const [sess] = await db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          eq(studySessions.status, "in_progress"),
        ),
      )
      .limit(1);

    if (!sess) return null;

    return {
      id: sess.id,
      userId: sess.userId,
      status: sess.status as SessionStatus,
      createdAt: sess.createdAt,
      completedAt: sess.completedAt,
    };
  }
}
