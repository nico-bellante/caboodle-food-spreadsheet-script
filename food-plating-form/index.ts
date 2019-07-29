// ====================== CONSTANTS ===================== //
const FOOD_DASHBOARD_SPREADSHEET_ID = "1gQNMd06hj6Lsh1OPWKC1L0wgc12aqiNroR97XV-D2cI";
const PLATING_FORM_URL =
  "https://docs.google.com/forms/d/1GG1NsHHXGsgI1sAXxJyXW9hZ-ZCGgYBx1bdcBSAPmqs/edit";
const OLD_RECORDING_FORM =
  "https://docs.google.com/forms/d/1ZXh5fvWS-kpAzAJAGDOIaHMR6WksKolkeYaya7QcyLU/edit";
const RECORDING_FORM_URL = PLATING_FORM_URL;
const CONSTANTS = {
  SHEET_NAMES: {
    BoardingSchedule: "Boarding Schedule",
    AllCatsInStore: "_private_all_cats_at_store",
    FeedingLogs: "Feeding Logs",
  },
};
const FOOD_RECORD_OPTIONS = ["Yes", "Half", "No"];
// ====================== TYPES ===================== //
type CatFeedingData = {
  [catName: string]: {
    food1: string;
    food2?: string;
    food3?: string;
    food4?: string;
  };
};

type IResponse = { question: string; answer: string };

// ======================== Setup ====================== //
function setupPlatingForm() {
  const form = clearAndOpenForm(PLATING_FORM_URL, { title: "Food Plating Form" });
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
        Logger.log(`processing: ${cat.name}`);
        return {
          name: cat.name,
          dietRestrictions: "TODO DIET RESTRICTION",
          favoriteFoods: {
            "Food A": { yes: 10, no: 2 },
            "Food B": { yes: 8, no: 3 },
            "Food C": { yes: 5, no: 4 },
          },
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
  const form = clearAndOpenForm(RECORDING_FORM_URL, { title: "Food Recording Form" });

  function createMCQuestionForFood(
    catName: string,
    foodName: string,
    prettyDate: string
  ) {
    const item = form.addMultipleChoiceItem();
    item.setTitle(`Did '${catName}' eat all of the '${foodName}' on ${prettyDate}?`);
    item.setChoices(FOOD_RECORD_OPTIONS.map(option => item.createChoice(option)));
    item.setRequired(true);
  }

  getAllFeedingsWithQuestionMark().forEach(data => {
    const prettyDate =
      data.date.getMonth() +
      1 +
      "/" +
      data.date.getDate() +
      "/" +
      data.date.getFullYear() +
      " " +
      data.amPM;
    form.addPageBreakItem().setTitle(`${data.catName}`);

    data.foods.forEach(({ name }) => {
      createMCQuestionForFood(data.catName, name, prettyDate);
    });
  });
}
function onPlatingFormSubmit(event) {
  const responses: IResponse[] = event.response.getItemResponses().map(itemResponse => ({
    question: itemResponse.getItem().getTitle(),
    answer: itemResponse.getResponse(),
  }));

  const { date, amPM, chef } = getDateAndChef(responses);
  const timestamp = Date.now();
  const feedingData = responses.reduce(
    (all, resp) => ({
      ...all,
      ...processResponseForFeedingData(resp),
    }),
    {}
  );

  const sheet = SpreadsheetApp.openById(FOOD_DASHBOARD_SPREADSHEET_ID).getSheetByName(
    "Test"
  );
  Object.keys(feedingData).forEach(catName => {
    const rowValues = getFeedingRowData({
      timestamp,
      date,
      amPM,
      catName,
      ...feedingData[catName],
    });
    sheet
      .insertRowBefore(3)
      .getRange(3, 1, 1, rowValues.length)
      .setValues([rowValues]);
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
function processResponseForFeedingData(response: IResponse): CatFeedingData | null {
  const match = response.question.match(/(\w+)\'s Food/);
  const [food1, food2, food3, food4, ...rest] = response.answer.split(/\s*[\/\-\,]\s*/);
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
    getQuestionMarkOrDash(data.food4),
  ];
}
// ====================== RECORDING ===================== //

function getAllFeedingsWithQuestionMark() {
  const sheet = SpreadsheetApp.openById(FOOD_DASHBOARD_SPREADSHEET_ID).getSheetByName(
    FEEDING_LOGS_SHEET_NAME
  );

  const data: {
    timestamp: string;
    date: Date;
    amPM: string;
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
      const [
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
      ] = sheet.getRange(index, 1, 1, 13).getValues()[0];

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
        foods,
      };
    });

  return data;
}
// ====================== HELPERS ===================== //
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

function makeYesNoBarGraph(data: FoodHistoryData): GoogleAppsScript.Charts.Chart {
  const maxTotalFeedings = Object.keys(data).reduce((max: number, foodName: string) => {
    const thisRow = data[foodName];
    return Math.max(
      max,
      Object.keys(thisRow)
        .map(k => thisRow[k])
        .reduce((a, b) => a + b, 0)
    );
  }, 0);
  let dataTableBuilder = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, "Month")
    .addColumn(Charts.ColumnType.NUMBER, "Yes")
    // .addColumn(Charts.ColumnType.NUMBER, 'Half')
    .addColumn(Charts.ColumnType.NUMBER, "No");

  Object.keys(data).forEach(foodName => {
    dataTableBuilder = dataTableBuilder.addRow([
      foodName,
      data[foodName].yes,
      data[foodName].no,
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

// ====================== SPREADSHEET ===================== //
function getTableDataFromSheetAsArrOfObj<T extends {}>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): T[] {
  const [headers, ...data] = sheet.getDataRange().getValues();
  return data.map(row => headers.reduce((o, header, i) => ({ ...o, [header]: row[i] })));
}

function getAllCatsInStore() {
  const sheet = SpreadsheetApp.openById(FOOD_DASHBOARD_SPREADSHEET_ID).getSheetByName(
    CONSTANTS.SHEET_NAMES.AllCatsInStore
  );
  return getTableDataFromSheetAsArrOfObj<CatSchema>(sheet).filter(({ name }) =>
    Boolean(name)
  );
}

//// junk
function testWrite() {
  const sheet = SpreadsheetApp.openById(FOOD_DASHBOARD_SPREADSHEET_ID).getSheetByName(
    "Test"
  );
  sheet.getRange(1, 1).setValue(Date.now());
}

function testFormOnSubmit() {
  const foo = { a: 1, b: 2, c: 3 };
  onPlatingFormSubmit(foo);
}

// function onFormSubmit(event: GoogleAppsScript.Events.FormsOnSubmit) {
//   Logger.log(event);
//   const { namedValues } = event;
//   Logger.log(namedValues);
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
//   Logger.log(JSON.stringify(foodDistributionData));

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
