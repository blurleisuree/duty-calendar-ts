import { PrismaClient } from "@prisma/client";
import { parseExcel } from "@server/excel/parseExcel";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Удаляем все старые данные (сначала shifts, потом остальные, чтобы не нарушить FK)
    await prisma.shifts.deleteMany({});
    await prisma.phones.deleteMany({});
    await prisma.employees.deleteMany({});
    await prisma.duty_officers.deleteMany({}); // <-- переместить сюда
    await prisma.organizations.deleteMany({});
    await prisma.subcategories.deleteMany({});
    await prisma.categories.deleteMany({});

    const formData = await request.formData();
    const file = formData.get("file");

    // // Валидация на сервере
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Файл не предоставлен" },
        { status: 400 },
      );
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Неподдерживаемый формат файла" },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой" },
        { status: 400 },
      );
    }

    // Парсинг и сохранение
    const data = await parseExcel(file);
    if (data.length === 0) {
      return NextResponse.json({ error: "Файл пуст" }, { status: 400 });
    }

    // Валидация структуры данных
    // for (const row of data) {
    // if (!row.name || typeof row.value !== 'number') {
    //   return NextResponse.json(
    //     { error: 'Некорректная структура данных' },
    //     { status: 400 }
    //   );
    // }
    // }

    // Сохранение в базу данных
    for (const row of data) {
      let category: Awaited<
        ReturnType<typeof prisma.categories.upsert>
      > | null = null;
      let subcategory: Awaited<
        ReturnType<typeof prisma.subcategories.upsert>
      > | null = null;
      let organization: Awaited<
        ReturnType<typeof prisma.organizations.upsert>
      > | null = null;
      let employee: Awaited<ReturnType<typeof prisma.employees.upsert>> | null =
        null;
      // Обработка оперативных дежурных
      // Можно вынести в отдельное место для чистоты кода
      console.log(row);
      if (row.isDutyOfficer) {
        // Категория обязательная
        if (row.category) {
          category = await prisma.categories.upsert({
            where: { name: row.category },
            update: {},
            create: { name: row.category },
          });

          if (row.subcategory) {
            subcategory = await prisma.subcategories.upsert({
              where: {
                name_category_id: {
                  name: row.subcategory,
                  category_id: category.id,
                },
              },
              update: {},
              create: {
                name: row.subcategory,
                category_id: category.id,
              },
            });
          }
          // Организация обязательная
          if (row.organization) {
            organization = await prisma.organizations.upsert({
              where: { name: row.organization },
              update: {
                subcategory_id: subcategory?.id ?? null,
                category_id: category.id,
              },
              create: {
                name: row.organization,
                subcategory_id: subcategory?.id ?? null,
                category_id: category.id,
              },
            });

            await prisma.duty_officers.create({
              data: {
                position: row.position ?? "",
                phones: Array.isArray(row.phones) ? row.phones.join(", ") : "",
                category_id: category.id,
                subcategory_id: subcategory?.id,
                organization_id: organization.id,
              },
            });
          } else {
            console.error("Нет организации для оперативного дежурного:", row);
          }
        } else {
          console.error("Нет категории для оперативного дежурного:", row);
        }
        continue;
      }

      // Проверка обязательных полей
      if (!row.category || !row.organization) {
        console.error("Пропуск строки: нет категории или организации", row);
        continue;
      }

      // 1. Категория
      category = await prisma.categories.upsert({
        where: { name: row.category },
        update: {},
        create: { name: row.category },
      });

      // 2. Подкатегория
      //  subcategory = null;
      if (row.subcategory) {
        subcategory = await prisma.subcategories.upsert({
          where: {
            name_category_id: {
              name: row.subcategory,
              category_id: category.id,
            },
          },
          update: {},
          create: {
            name: row.subcategory,
            category_id: category.id,
          },
        });
      }

      // 3. Организация
      try {
        organization = await prisma.organizations.upsert({
          where: { name: row.organization },
          update: {
            subcategory_id: subcategory?.id ?? null,
            category_id: category.id,
          },
          create: {
            name: row.organization,
            subcategory_id: subcategory?.id ?? null,
            category_id: category.id,
          },
        });
      } catch (err) {
        console.error(
          "Ошибка при создании организации:",
          row.organization,
          err,
        );
        continue;
      }

      // 4. Сотрудник
      try {
        if (row.position && row.fullName) {
          employee = await prisma.employees.upsert({
            where: {
              full_name_organization_id: {
                full_name: row.fullName,
                organization_id: organization.id,
              },
            },
            update: { position: row.position },
            create: {
              full_name: row.fullName,
              position: row.position,
              organization_id: organization.id,
            },
          });
        } else {
          console.error("Пропуск строки: нет должности или ФИО", row);
        }
      } catch (err) {
        console.error(
          "Ошибка при создании/обновлении сотрудника:",
          row.fullName,
          row.organization,
          err,
        );
      }

      // 5. Телефоны
      if (Array.isArray(row.phones)) {
        for (const phone of row.phones) {
          if (employee) {
            await prisma.phones.upsert({
              where: {
                employee_id_phone_number: {
                  employee_id: employee.id,
                  phone_number: phone,
                },
              },
              update: {},
              create: {
                employee_id: employee.id,
                phone_number: phone,
              },
            });
          } else {
            console.error(
              "Пропуск строки: не указан работник при создании номеров",
              row,
            );
          }
        }
      }
      console.log(row.timeStart, row.timeEnd);
      // 6. Смена
      if (employee) {
        if (!row.date) {
          console.error("Пропуск строки: нет даты для смены", row);
          continue;
        }

        await prisma.shifts.create({
          data: {
            employee_id: employee.id,
            organization_id: organization.id,
            shift_date: new Date(row.date),
            start_time: row.timeStart ? row.timeStart : null,
            end_time: row.timeEnd ? row.timeEnd : null,
          },
        });
      } else {
        console.error(
          "Пропуск строки: не указан работник при создании смен",
          row,
        );
      }
    }

    return NextResponse.json({ message: "Данные сохранены", data });
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
