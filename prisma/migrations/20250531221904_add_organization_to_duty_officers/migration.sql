/*
  Warnings:

  - Added the required column `organization_id` to the `duty_officers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "duty_officers" ADD COLUMN     "organization_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "duty_officers" ADD CONSTRAINT "duty_officers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
