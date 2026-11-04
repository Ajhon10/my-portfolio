CREATE TABLE "game_score" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(24) NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_score_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_score_nonnegative" CHECK ("score" >= 0 AND "score" <= 1000000)
);

CREATE INDEX "game_score_score_created_at_idx" ON "game_score"("score" DESC, "created_at" ASC);
