const SPREADSHEET_ID = "1gQNMd06hj6Lsh1OPWKC1L0wgc12aqiNroR97XV-D2cI";

type IResponse = { question: string; answer: string[]; rows: string[] };
type FoodResponseStatus = "Yes" | "No" | "Half";
function onFormSubmit(event: any) {
  const responses: IResponse[] = event.response
    .getItemResponses()
    .map((itemResponse: any) => ({
      question: itemResponse.getItem().getTitle(),
      answer: itemResponse.getResponse(),
      rows: itemResponse
        .getItem()
        .asGridItem()
        .getRows(),
    }));

  const byPrettyDate: {
    [prettyDate: string]: {
      [catName: string]: {
        [foodName: string]: FoodResponseStatus;
      };
    };
  } = responses.reduce((byPrettyDate, response) => {
    const prettyDate = response.question.replace(" Feeding", "");
    const results = response.rows
      .map((row, i) => {
        const [match, catName, foodName] = row.match(/(.*)\s\-\s(.*)/)!;
        return {
          catName,
          foodName,
          foodStatus: response.answer[i] as FoodResponseStatus,
        };
      })
      .reduce(
        (byCatName, item) => ({
          ...byCatName,
          [item.catName]: {
            ...byCatName[item.catName],
            [item.foodName]: item.foodStatus,
          },
        }),
        {} as { [catName: string]: { [foodName: string]: FoodResponseStatus } },
      );

    return { ...byPrettyDate, [prettyDate]: results };
  }, {});

  addLogToLogSheet(responses, "responses");
  addLogToLogSheet(byPrettyDate, "byprettydate");

  const sheet: GoogleAppsScript.Spreadsheet.Sheet = SpreadsheetApp.openById(
    SPREADSHEET_ID,
  ).getSheetByName("Feeding Logs");

  const existingData = sheet
    .getRange("B3:D")
    .getValues()
    .map((row, i) => ({ i, date: row[0], amPM: row[1], catName: row[2] }));

  Object.keys(byPrettyDate).forEach(prettyDate => {
    const data = byPrettyDate[prettyDate];
    const { date, amPM } = convertPrettyDateIntoDateAmPm(prettyDate);
    Object.keys(data).forEach(catName => {
      existingData
        .filter(
          existingItem =>
            existingItem.amPM === amPM &&
            getDateStringFromDate(existingItem.date) === getDateStringFromDate(date) &&
            existingItem.catName === catName,
        )
        .map(({ i }) => i + 3)
        .forEach(i => {
          const existingItem = getRowOfFeedingLog(sheet, i);
          addLogToLogSheet(existingItem, `existing item ${i}`);
          Object.keys(data[catName]).forEach(foodName => {
            const newStatus = data[catName][foodName].charAt(0);
            switch (foodName) {
              case existingItem.food1:
                existingItem.food1Status = newStatus;
                break;
              case existingItem.food2:
                existingItem.food2Status = newStatus;
                break;
              case existingItem.food3:
                existingItem.food3Status = newStatus;
                break;
              case existingItem.food4:
                existingItem.food4Status = newStatus;
                break;
            }
          });
          addLogToLogSheet(existingItem, `existing item after ${i}`);
          writeFeedingLogRowOfData(sheet, i, { ...existingItem });
        });
    });
  });
}

//////////////////////////////////////////////////////

type FeedingLogItem = {
  timestamp: number;
  date: Date;
  amPM: "AM" | "PM";
  catName: string;
  status: string;
  foods: { name: string; status: string }[];
};

function getFeedingLogItem(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  index: number,
): FeedingLogItem {
  const {
    timestamp,
    date,
    amPM,
    catName,
    status,
    food1,
    food1Status,
    food2,
    food2Status,
    food3,
    food3Status,
    food4,
    food4Status,
  } = getRowOfFeedingLog(sheet, index);
  const foods = [];

  if (food1Status && food1Status !== "--") {
    foods.push({ name: food1, status: food1Status });
    if (food2Status && food2Status !== "--") {
      foods.push({ name: food2, status: food2Status });
      if (food3Status && food3Status !== "--") {
        foods.push({ name: food3, status: food3Status });
        if (food4Status && food4Status !== "--") {
          foods.push({ name: food4, status: food4Status });
        }
      }
    }
  }

  return {
    timestamp,
    date,
    amPM,
    catName,
    status,
    foods,
  };
}

function getDateStringFromDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

type FeedingLogRowOfData = {
  timestamp: number;
  date: Date;
  amPM: "AM" | "PM";
  catName: string;
  status: string;
  food1: string;
  food1Status: string;
  food2: string;
  food2Status: string;
  food3: string;
  food3Status: string;
  food4: string;
  food4Status: string;
};

function getRowOfFeedingLog(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  index: number,
): FeedingLogRowOfData {
  // addLogToLogSheet(sheet.getRange(index, 1, 1, 13).getValues()[0], "feedingrowlog");
  const [
    timestamp,
    date,
    amPM,
    catName,
    _,
    food1,
    food1Status,
    food2,
    food2Status,
    food3,
    food3Status,
    food4,
    food4Status,
  ] = sheet.getRange(index, 1, 1, 13).getValues()[0];

  const status = sheet.getRange(index, 5).getFormula();
  return {
    timestamp,
    date,
    amPM,
    catName,
    status,
    food1,
    food1Status,
    food2,
    food2Status,
    food3,
    food3Status,
    food4,
    food4Status,
  };
}

function writeFeedingLogRowOfData(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  index: number,
  {
    timestamp,
    date,
    amPM,
    catName,
    status,
    food1,
    food1Status,
    food2,
    food2Status,
    food3,
    food3Status,
    food4,
    food4Status,
  }: FeedingLogRowOfData,
): void {
  sheet
    .getRange(index, 1, 1, 13)
    .setValues([
      [
        timestamp,
        date,
        amPM,
        catName,
        status,
        food1,
        food1Status,
        food2,
        food2Status,
        food3,
        food3Status,
        food4,
        food4Status,
      ],
    ]);
}

type RealFeedingRowData = {
  timestamp: number;
  date: string;
  amPM: "AM" | "PM";
  catName: string;
  food1: string;
  food2?: string;
  food3?: string;
  food4?: string;
};

function prepareFeedingRowData(data: RealFeedingRowData) {
  const getQuestionMarkOrDash = (food?: string) => (food ? "?" : "--");
  return [
    new Date(data.timestamp).toISOString(),
    data.date,
    data.amPM,
    data.catName,
    '=IF(COUNTIF({G3,I3,K3,M3}, "Y"), "Y", (IF(COUNTIF({G3,I3,K3,M3}, "~?"),"?", "N")))',
    data.food1,
    getQuestionMarkOrDash(data.food1),
    data.food2 || "--",
    getQuestionMarkOrDash(data.food2),
    data.food3 || "--",
    getQuestionMarkOrDash(data.food3),
    data.food4 || "--",
    getQuestionMarkOrDash(data.food4),
  ];
}

function convertPrettyDateIntoDateAmPm(
  prettyDate: string,
): { date: Date; amPM: "AM" | "PM" } {
  const dateRegex = /(\d\d?\s*\/\s*\d\d?\s*\/\s*\d\d\d\d)\s+(AM|PM)/;
  const match = prettyDate.match(dateRegex);
  const date = new Date(match![1]);
  const amPM = match![2] as "AM" | "PM";
  return { date, amPM };
}

let LOG_COUNT = 1;
function addLogToLogSheet(obj: any, note?: string) {
  const LOG_SHEET = SpreadsheetApp.openById(
    "1gQNMd06hj6Lsh1OPWKC1L0wgc12aqiNroR97XV-D2cI",
  ).getSheetByName("Logs");
  const THIS_LOG_NO = LOG_COUNT++;
  LOG_SHEET.getRange(THIS_LOG_NO, 1).setValue(JSON.stringify(obj, null, 4));
  if (note) {
    LOG_SHEET.getRange(THIS_LOG_NO, 2).setValue(note);
  }
}
