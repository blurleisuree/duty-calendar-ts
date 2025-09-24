-- CreateTable
CREATE TABLE "duty_officers" (
    "id" SERIAL NOT NULL,
    "position" VARCHAR(500) NOT NULL,
    "phones" VARCHAR(200) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "subcategory_id" INTEGER,

    CONSTRAINT "duty_officers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "duty_officers" ADD CONSTRAINT "duty_officers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duty_officers" ADD CONSTRAINT "duty_officers_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
