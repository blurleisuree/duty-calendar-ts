import * as XLSX from 'xlsx';

// import chrono from 'chrono-node';

function convertToISODate(dateValue) {
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(
      excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000
    );
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

const formatPhone = (phone) => {
  if (!phone) return null;
  const phoneStr = String(phone);
  return phoneStr
    .split(',')
    .map((num) => num.trim().replace(/\s/g, ''))
    .filter((num) => num);
};

function cleanString(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
}

function capitalizeFirstLetter(str) {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function excelTimeToHHMM(timeValue) {
  // Excel time as float (e.g. 0.375) => "09:00"
  if (typeof timeValue === 'number') {
    const totalMinutes = Math.round(timeValue * 24 * 60);
    const hours = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  // Если строка — вернуть только HH:mm
  if (typeof timeValue === 'string') {
    const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return null;
}

export async function parseExcel(formData) {
  const arrayBuffer = await formData.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const parsedData = [];
  for (const row of rawData) {
    // Валидация обязательных полей
    // if (!row['Категория'] || !row['Организация'] || !row['ФИО'] || !row['Дата']) {
    //   continue; // Пропускаем строки с пустыми обязательными полями
    // }

    const category = row['Категория']
      ? capitalizeFirstLetter(cleanString(row['Категория']))
      : null;
    const subcategory = row['Подкатегория']
      ? capitalizeFirstLetter(cleanString(row['Подкатегория']))
      : null;
    const organization = row['Организация']
      ? capitalizeFirstLetter(cleanString(row['Организация']))
      : null;
    const fullName = row['ФИО']
      ? capitalizeFirstLetter(cleanString(row['ФИО']))
      : null;
    const position = row['Должность']
      ? capitalizeFirstLetter(cleanString(row['Должность']))
      : null;

    // Парсинг даты
    let date = row['Дата'] ? convertToISODate(row['Дата']) : null;

    // Парсинг времени
    let timeStart = row['Время с:'] ? excelTimeToHHMM(row['Время с:']) : null;
    let timeEnd = row['Время по:'] ? excelTimeToHHMM(row['Время по:']) : null;

    // Если время невалидно (пустая строка), делаем null
    if (!timeStart) timeStart = null;
    if (!timeEnd) timeEnd = null;

    // Парсинг телефонов
    const phones = row['Телефон'] ? formatPhone(row['Телефон']) : null;

    // Оперативный дежурный: есть категория, должность, телефоны, нет даты и нет ФИО
    const isDutyOfficer =
      category && organization && position && phones && !date && !fullName;

    parsedData.push({
      category,
      subcategory,
      organization,
      fullName,
      position,
      phones,
      date,
      timeStart,
      timeEnd,
      isDutyOfficer,
    });
  }

  return parsedData;
}
