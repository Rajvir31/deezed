-- CreateTable
CREATE TABLE "powerlift_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lift" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "powerlift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "powerlift_logs_userId_lift_date_idx" ON "powerlift_logs"("userId", "lift", "date");

-- AddForeignKey
ALTER TABLE "powerlift_logs" ADD CONSTRAINT "powerlift_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
