let LOG_COUNT = 1;
function addLogToLogSheet(obj: any, note?: string) {
  const sheet = SpreadsheetApp.openById(
    FOOD_DASHBOARD_SPREADSHEET_ID
  ).getSheetByName("Logs");
  const THIS_LOG_NO = LOG_COUNT++;
  sheet.getRange(THIS_LOG_NO, 1).setValue(JSON.stringify(obj, null, 4));
  if (note) {
    sheet.getRange(THIS_LOG_NO, 2).setValue(note);
  }
}
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, "find", {
    value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== "function") {
        throw new TypeError("predicate must be a function");
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}
// ====================== CONSTANTS ===================== //
const FOOD_DASHBOARD_SPREADSHEET_ID =
  "1gQNMd06hj6Lsh1OPWKC1L0wgc12aqiNroR97XV-D2cI";
const PLATING_FORM_URL =
  "https://docs.google.com/forms/d/1AKtI-Ey5P1QkrMjNy-nQaT-9w-WA6CE8VtoUsHAhMtI/edit";
const OLD_RECORDING_FORM =
  "https://docs.google.com/forms/d/1ZXh5fvWS-kpAzAJAGDOIaHMR6WksKolkeYaya7QcyLU/edit";
const RECORDING_FORM_URL = PLATING_FORM_URL;
const CONSTANTS = {
  SHEET_NAMES: {
    BoardingSchedule: "Boarding Schedule",
    AllCatsInStore: "_private_all_cats_at_store",
    FeedingLogs: "Feeding Logs"
  },
  TITLES: {
    PlatingForm: "Food Plating Form",
    RecordingForm: "Food Recording Form"
  }
};
const FOOD_RECORD_OPTIONS = ["Yes", "Half", "No"];
const FOOD_RECORD_MAP = {
  Yes: "Y",
  No: "N",
  Half: "H"
};
// ====================== TYPES ===================== //
type CatFeedingData = {
  [catName: string]: {
    food1: string;
    food2?: string;
    food3?: string;
    food4?: string;
  };
};

type CatSchema = {
  adoptOrBoard: "Adopt" | "Board";
  name: string;
  startDate: Date;
  endDate: Date;
  daysHere: number;
  daysLeft: number;
  hereUntil: string;
};
type IResponse = { question: string; answer: string };
type FoodRecordOptions = "Yes" | "Half" | "No";

// ======================== Setup ====================== //
function setupPlatingForm() {
  const form = clearAndOpenForm(PLATING_FORM_URL, {
    title: "Food Plating Form"
  });
  form
    .addTextItem()
    .setTitle("Preparer for 7/20/2019 AM")
    .setRequired(true);

  getAllCatsInStore()
    .map(
      (
        cat: CatSchema
      ): {
        name: string;
        dietRestrictions?: string;
        otherNotes?: string;
        favoriteFoods?: FoodHistoryData;
      } => {
        addLogToLogSheet(`processing: ${cat.name}`);
        return {
          name: cat.name,
          dietRestrictions: "TODO DIET RESTRICTION",
          favoriteFoods: {
            "Food A": { yes: 10, no: 2 },
            "Food B": { yes: 8, no: 3 },
            "Food C": { yes: 5, no: 4 }
          }
        };
      }
    )
    .forEach(data => {
      form.addPageBreakItem().setTitle(data.name);
      form
        .addImageItem()
        .setTitle("Food for past X")
        .setImage(makeYesNoBarGraph(data.favoriteFoods).getBlob());
      form
        .addTextItem()
        .setTitle(`${data.name}'s Food`)
        .setRequired(true);
    });
}

function setupRecordingForm() {
  const form = clearAndOpenForm(RECORDING_FORM_URL, {
    title: CONSTANTS.TITLES.RecordingForm
  });

  function createMCQuestionForFood(
    catName: string,
    foodName: string,
    prettyDate: string
  ) {
    const item = form.addMultipleChoiceItem();
    item.setTitle(
      convertFoodInfoIntoQuestion({ catName, foodName, prettyDate })
    );
    item.setChoices(
      FOOD_RECORD_OPTIONS.map(option => item.createChoice(option))
    );
    item.setRequired(true);
  }

  getAllFeedingsWithQuestionMark().forEach(data => {
    const prettyDate = convertDateAmPmIntoPrettyDate(data.date, data.amPM);
    form.addPageBreakItem().setTitle(`${data.catName}`);

    data.foods.forEach(({ name }) => {
      createMCQuestionForFood(data.catName, name, prettyDate);
    });
  });
}
// ============================ Triggers ======================== //
function onFormSubmit(event) {
  const responses: IResponse[] = event.response
    .getItemResponses()
    .map(itemResponse => ({
      question: itemResponse.getItem().getTitle(),
      answer: itemResponse.getResponse()
    }));
  const title = FormApp.openByUrl(RECORDING_FORM_URL).getTitle();
  if (title === CONSTANTS.TITLES.PlatingForm) {
    onPlatingFormSubmit(responses);
  } else if (title === CONSTANTS.TITLES.RecordingForm) {
    onRecordingFormSubmit(responses);
  }
}
function onPlatingFormSubmit(responses: IResponse[]) {
  const { date, amPM, chef } = getDateAndChef(responses);
  const timestamp = Date.now();
  const feedingData = responses.reduce(
    (all, resp) => ({
      ...all,
      ...processResponseForFeedingData(resp)
    }),
    {}
  );

  const sheet = SpreadsheetApp.openById(
    FOOD_DASHBOARD_SPREADSHEET_ID
  ).getSheetByName(CONSTANTS.SHEET_NAMES.FeedingLogs);

  Object.keys(feedingData).forEach(catName => {
    const rowValues = getFeedingRowData({
      timestamp,
      date,
      amPM,
      catName,
      ...feedingData[catName]
    });
    sheet
      .insertRowBefore(3)
      .getRange(3, 1, 1, rowValues.length)
      .setValues([rowValues]);
  });
}

function testOnRecordingFormSubmit() {
  const o = {
    question: `Did 'Foo' eat all of the 'foo fooo' on 7/20/2019 AM?`,
    answer: "Yes"
  };
  const arr = [o];
  addLogToLogSheet(o, "o");
  addLogToLogSheet(arr, "arr");
  onRecordingFormSubmit(arr);
}

function onRecordingFormSubmit(responses: IResponse[]) {
  addLogToLogSheet(responses, "responses");
  const rawData: {
    prettyDate: string;
    catName: string;
    foodName: string;
    response: FoodRecordOptions;
  }[] = responses
    .map(({ question, answer }) => {
      const result: FoodInfo | null = convertQuestionIntoFoodInfo(question);
      addLogToLogSheet(
        `question: ${JSON.stringify(
          question,
          null,
          4
        )}; answer: ${JSON.stringify(answer, null, 4)}`
      );
      addLogToLogSheet(result, "result");
      if (result === null) {
        return null;
      }
      const { prettyDate, catName, foodName } = result;
      return {
        prettyDate,
        catName,
        foodName,
        response: answer as FoodRecordOptions
      };
    })
    .filter(Boolean);
  addLogToLogSheet(rawData, "rawData");
  const tempTransformedData = rawData.reduce((all, item) => {
    const key = `${item.prettyDate}|${item.catName}`;
    return {
      ...all,
      [key]: { ...all[key], [item.foodName]: FOOD_RECORD_MAP[item.response] }
    };
  }, {});

  addLogToLogSheet(tempTransformedData, "tempTransformedData");

  const data = Object.keys(tempTransformedData).map(prettyDateAndCatName => {
    const [prettyDate, catName] = prettyDateAndCatName.split("|");
    const { date, amPM } = convertPrettyDateIntoDateAmPm(prettyDate);
    return {
      date,
      amPM,
      catName,
      results: tempTransformedData[prettyDateAndCatName] as {
        [foodName: string]: FoodRecordOptions;
      }
    };
  });

  addLogToLogSheet(tempTransformedData, "tempTransformedData");

  const sheet = SpreadsheetApp.openById(
    FOOD_DASHBOARD_SPREADSHEET_ID
  ).getSheetByName(CONSTANTS.SHEET_NAMES.FeedingLogs);

  data.forEach(item => {
    sheet
      .getRange("B3:D")
      .getValues()
      .map((row, i) => ({ i, date: row[0], amPM: row[1], catName: row[2] }))
      .filter(({ date, amPM, catName }) => {
        const result =
          item.date.toString() === date.toString() &&
          item.amPM === amPM &&
          item.catName === catName;
        return result;
      })
      .map(({ i }) => i + 3)
      .forEach(i => {
        addLogToLogSheet(i, "i");
        const existingData = getRowOfFeedingLog(sheet, i);
        addLogToLogSheet(existingData, `existing data for ${i}`);
        Object.keys(item.results).forEach(result => {
          const newStatus = item.results[result];
          switch (result) {
            case existingData.food1:
              existingData.food1Status = newStatus;
              break;
            case existingData.food2:
              existingData.food2Status = newStatus;
              break;
            case existingData.food3:
              existingData.food3Status = newStatus;
              break;
            case existingData.food4:
              existingData.food4Status = newStatus;
              break;
          }
        });
        writeFeedingLogRowOfData(sheet, i, { ...existingData });
      });
  });
}

// ====================== GENERAL ===================== //
function getDateAndChef(
  responses: IResponse[]
): { date: string; amPM: "AM" | "PM"; chef: string } {
  const dateRegex = /(\d\d?\s*\/\s*\d\d?\s*\/\s*\d\d\d\d)\s+(AM|PM)/;
  const dateKey = responses
    .map(({ question }) => question)
    .find(key => key.match(dateRegex));
  const match = dateKey.match(dateRegex);
  const date = match[1];
  const amPM = match[2] as "AM" | "PM";
  const chef = responses[dateKey];
  return { date, amPM, chef };
}

// ====================== PLATING ===================== //
function processResponseForFeedingData(
  response: IResponse
): CatFeedingData | null {
  const match = response.question.match(/(\w+)\'s Food/);
  const [food1, food2, food3, food4, ...rest] = response.answer.split(
    /\s*[\/\-\,]\s*/
  );
  return match && match[1] && food1 !== ""
    ? { [match[1]]: { food1, food2, food3, food4 } }
    : null;
}

function getFeedingRowData(data: {
  timestamp: number;
  date: string;
  amPM: "AM|PM";
  catName: string;
  food1: string;
  food2?: string;
  food3?: string;
  food4?: string;
}) {
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
    getQuestionMarkOrDash(data.food4)
  ];
}
// ====================== RECORDING ===================== //
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
  index: number
): FeedingLogRowOfData {
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
    food4Status
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
    food4Status
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
    food4Status
  }: FeedingLogRowOfData
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
        food4Status
      ]
    ]);
}
function getAllFeedingsWithQuestionMark() {
  const sheet = SpreadsheetApp.openById(
    FOOD_DASHBOARD_SPREADSHEET_ID
  ).getSheetByName(CONSTANTS.SHEET_NAMES.FeedingLogs);

  const data: {
    timestamp: number;
    date: Date;
    amPM: "AM" | "PM";
    catName: string;
    status: string;
    foods: { name: string; status: string }[];
  }[] = sheet
    .getRange("E3:E")
    .getValues()
    .map((row, i) => ({ i, value: row[0] }))
    .filter(({ value }) => value === "?")
    .map(({ i }) => i + 3)
    .map(index => {
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
        food4Status
      } = getRowOfFeedingLog(sheet, index);

      const foods = [];

      if (food1Status === "?") {
        foods.push({ name: food1, status: food1Status });
        if (food2Status === "?") {
          foods.push({ name: food2, status: food2Status });
          if (food3Status === "?") {
            foods.push({ name: food3, status: food3Status });
            if (food4Status === "?") {
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
        foods
      };
    });

  return data;
}
// ====================== HELPERS ===================== //
function convertDateAmPmIntoPrettyDate(date: Date, amPM: "AM" | "PM"): string {
  return (
    date.getMonth() +
    1 +
    "/" +
    date.getDate() +
    "/" +
    date.getFullYear() +
    " " +
    amPM
  );
}
function convertPrettyDateIntoDateAmPm(
  prettyDate: string
): { date: Date; amPM: "AM" | "PM" } {
  const dateRegex = /(\d\d?\s*\/\s*\d\d?\s*\/\s*\d\d\d\d)\s+(AM|PM)/;
  const match = prettyDate.match(dateRegex);
  const date = new Date(match[1]);
  const amPM = match[2] as "AM" | "PM";
  return { date, amPM };
}
function clearAndOpenForm(url: string, options?: { title?: string }) {
  const form = FormApp.openByUrl(url);
  form.deleteAllResponses();
  form.getItems().forEach(item => form.deleteItem(item));

  if (options.title) {
    form.setTitle(options.title);
  }

  return form;
}

type FoodHistoryData = {
  [foodName: string]: { yes: number; no: number };
};

function makeYesNoBarGraph(
  data: FoodHistoryData
): GoogleAppsScript.Charts.Chart {
  const maxTotalFeedings = Object.keys(data).reduce(
    (max: number, foodName: string) => {
      const thisRow = data[foodName];
      return Math.max(
        max,
        Object.keys(thisRow)
          .map(k => thisRow[k])
          .reduce((a, b) => a + b, 0)
      );
    },
    0
  );
  let dataTableBuilder = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, "Month")
    .addColumn(Charts.ColumnType.NUMBER, "Yes")
    // .addColumn(Charts.ColumnType.NUMBER, 'Half')
    .addColumn(Charts.ColumnType.NUMBER, "No");

  Object.keys(data).forEach(foodName => {
    dataTableBuilder = dataTableBuilder.addRow([
      foodName,
      data[foodName].yes,
      data[foodName].no
    ]);
  });

  const chart = Charts.newBarChart()
    .setDataTable(dataTableBuilder as GoogleAppsScript.Charts.DataTableBuilder)
    .setStacked()
    .setRange(0, maxTotalFeedings)
    .setColors(["green", "red"])
    .build();
  return chart;
}
type FoodInfo = { foodName: string; catName: string; prettyDate: string };
function convertQuestionIntoFoodInfo(question: string): FoodInfo | null {
  const match = /Did '(.*)' eat all of the '(.*)' on (\d\d?\s*\/\s*\d\d?\s*\/\s*\d\d\d\d\s+(AM|PM))\?/.exec(
    question
  );
  // const match = question.match(questionRegex);
  if (!match) {
    return null;
  }
  const [ignore, catName, foodName, prettyDate] = match;
  return { foodName, catName, prettyDate };
}
function convertFoodInfoIntoQuestion({
  catName,
  foodName,
  prettyDate
}: FoodInfo): string {
  return `Did '${catName}' eat all of the '${foodName}' on ${prettyDate}?`;
}

// ====================== SPREADSHEET ===================== //
function getTableDataFromSheetAsArrOfObj<T extends {}>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): T[] {
  const [headers, ...data] = sheet.getDataRange().getValues();
  return data.map(row =>
    headers.reduce((o, header, i) => ({ ...o, [header]: row[i] }))
  );
}

function getAllCatsInStore() {
  const sheet = SpreadsheetApp.openById(
    FOOD_DASHBOARD_SPREADSHEET_ID
  ).getSheetByName(CONSTANTS.SHEET_NAMES.AllCatsInStore);
  return getTableDataFromSheetAsArrOfObj<CatSchema>(sheet).filter(({ name }) =>
    Boolean(name)
  );
}

//// junk
function testWrite() {
  const sheet = SpreadsheetApp.openById(
    FOOD_DASHBOARD_SPREADSHEET_ID
  ).getSheetByName("Test");
  sheet.getRange(1, 1).setValue(Date.now());
}

function testFormOnSubmit() {
  const foo = { a: 1, b: 2, c: 3 };
  onPlatingFormSubmit(foo);
}

// function onFormSubmit(event: GoogleAppsScript.Events.FormsOnSubmit) {
//   addLogToLogSheet(event);
//   const { namedValues } = event;
//   addLogToLogSheet(namedValues);
//   const dateRegex = /(\d\d?\s*\/\s*\d\d?\s*\/\s*\d\d\d\d)\s+(AM|PM)/;
//   const dateKey = Object.keys(namedValues).find(key => key.match(dateRegex));
//   const match = dateKey.match(dateRegex);
//   const date = match[1];
//   const amPM = match[2] as 'AM' | 'PM';
//   const chef = namedValues[dateKey][0];
//   const timestamp = Date.now();

//   const foodDistributionData: FoodDistributionData = {
//     date,
//     amPM,
//     chef,
//     timestamp,
//     data: Object.keys(namedValues)
//       .map(key => {
//         const match = key.match(/(\w+)\'s Food/);
//         const [food1, food2, food3, food4, ...rest] = namedValues[key][0].split(
//           /\s*[\/\-\,]\s*/,
//         );
//         return match && match[1]
//           ? { name: match[1], value: { food1, food2, food3, food4 } }
//           : null;
//       })
//       .filter(result => result && result.value.food1 && result.value.food1 !== '')
//       .reduce((obj, { name, value }) => ({ ...obj, [name]: value }), {}),
//   };
//   const sheet = SpreadsheetApp.openById(FOOD_DASHBOARD_SPREADSHEET_ID).getSheetByName(
//     FEEDING_LOGS_SHEET_NAME,
//   );
//   // ).getSheetByName(FEEDING_LOGS_SHEET_NAME);
//   addLogToLogSheet(JSON.stringify(foodDistributionData));

//   function getQuestionMarkOrDash(food: string | undefined) {
//     return food ? '?' : '-';
//   }

//   Object.keys(foodDistributionData.data).forEach(catName => {
//     const { food1, food2, food3, food4 } = foodDistributionData.data[catName];
//     const rowData = [
//       new Date(foodDistributionData.timestamp).toISOString(),
//       foodDistributionData.date,
//       foodDistributionData.amPM,
//       catName,
//       '=IF(COUNTIF({G3,I3,K3,M3}, "Y"), "Y", (IF(COUNTIF({G3,I3,K3,M3}, "~?"),"?", "N")))',
//       food1,
//       getQuestionMarkOrDash(food1),
//       food2 || '--',
//       getQuestionMarkOrDash(food2),
//       food3 || '--',
//       getQuestionMarkOrDash(food3),
//       food4 || '--',
//       getQuestionMarkOrDash(food4),
//     ];
//     sheet
//       .insertRowBefore(3)
//       .getRange(3, 1, 1, rowData.length)
//       .setValues([rowData]);
//   });

//   // sheet.getRange(1, 1).setValue(JSON.stringify(foodDistributionData, null, 4));
//   // sheet
//   //   .getRange(2, 1)
//   //   .setValue(JSON.stringify(foodDistributionData.data, null, 4));
//   // sheet.getRange(3, 1).setValue(JSON.stringify(namedValues, null, 4));
// }
