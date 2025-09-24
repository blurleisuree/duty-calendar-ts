/*
  Warnings:

  - Added the required column `category_id` to the `organizations` table without a default value. This is not possible if the table is not empty.

*/

-- 1. Добавить столбец, разрешающий NULL
ALTER TABLE "organizations" ADD COLUMN "category_id" INTEGER;

-- 2. Заполнить category_id для всех организаций (например, первой категорией)
UPDATE "organizations" SET "category_id" = (SELECT id FROM "categories" LIMIT 1);

-- 3. Сделать поле обязательным
ALTER TABLE "organizations" ALTER COLUMN "category_id" SET NOT NULL;

-- 4. Добавить внешний ключ
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
