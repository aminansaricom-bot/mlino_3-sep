/*
  Warnings:

  - The primary key for the `opportunity_interaction_state` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `actor_core_entity_id` on the `opportunity_interaction_state` table. All the data in the column will be lost.
  - Added the required column `actor_id` to the `opportunity_interaction_state` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "opportunity_interaction_state" DROP CONSTRAINT "opportunity_interaction_state_pkey",
DROP COLUMN "actor_core_entity_id",
ADD COLUMN     "actor_id" TEXT NOT NULL,
ADD CONSTRAINT "opportunity_interaction_state_pkey" PRIMARY KEY ("opportunity_correlation_id", "actor_id");
