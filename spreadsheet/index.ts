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
    writable: true,
  });
}

const SHEET_NAMES = {
  BoardingSchedule: "Boarding Schedule",
  AllCatsInStore: "_private_all_cats_at_store",
  FeedingLogs: "Feeding Logs",
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
/////////////////////////////////////////////////////

function copyFeedingDataMacro() {
  // figure out what cats are currently in the caboodle based off schedules
  const catsInStore = getAllCatsInStore();

  // figure out what the last feeding was
  const { date, amPM } = getLastFeedingDate();

  // find all cats that were fed on the last feeding and have a (Y/H) for their food result
  const lastSuccessfulFeedingLogs = getAllFeedingLogs(
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.FeedingLogs),
    {
      date,
      amPM,
      allowedStatusValues: ["Y", "H"],
    },
  );

  // figure out what the next feeding (this feeding)
  date.setDate(date.getDate() + amPM === "PM" ? 1 : 0);
  const nextFeedingDate = date;
  const nextFeedingAMpm = amPM === "AM" ? "PM" : "AM";

  const timestamp = Date.now();
  const newFeedingData: RealFeedingRowData[] = catsInStore.map(cat => {
    const lastFeedingForThisCat = lastSuccessfulFeedingLogs.find(
      log => log.catName === cat.name,
    );
    const suggestedFeeding = lastFeedingForThisCat
      ? lastFeedingForThisCat.foods.reduce(
          (obj, food, i) => ({ ...obj, [`food${i + 1}`]: food.name }),
          { food1: "???" },
        )
      : { food1: "???" };

    return {
      timestamp,
      date: getDateStringFromDate(nextFeedingDate),
      amPM: nextFeedingAMpm,
      catName: cat.name,
      ...suggestedFeeding,
    };
  });
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    SHEET_NAMES.FeedingLogs,
  );

  newFeedingData.map(prepareFeedingRowData).forEach(data => {
    sheet
      .insertRowBefore(3)
      .getRange(3, 1, 1, data.length)
      .setValues([data]);
  });

  // for cat in the list of cats that are currently in the caboodle
  //    check if cat is in previousYes list
  //      if so, copy what they ate last time into the new feeding data
  // write new feeding data to the beginning of sheet
}

///////////////////////////////////////////////////

function getTableDataFromSheetAsArrOfObj<T extends {}>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): T[] {
  const [headers, ...data] = sheet.getDataRange().getValues();
  return data.map(row => headers.reduce((o, header, i) => ({ ...o, [header]: row[i] })));
}

function getAllCatsInStore() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    SHEET_NAMES.AllCatsInStore,
  );
  return getTableDataFromSheetAsArrOfObj<CatSchema>(sheet).filter(({ name }) =>
    Boolean(name),
  );
}

let LOG_COUNT = 1;
function addLogToLogSheet(obj: any, note?: string) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Logs");
  const THIS_LOG_NO = LOG_COUNT++;
  sheet.getRange(THIS_LOG_NO, 1).setValue(JSON.stringify(obj, null, 4));
  if (note) {
    sheet.getRange(THIS_LOG_NO, 2).setValue(note);
  }
}

function getLastFeedingDate(): { date: Date; amPM: "AM" | "PM" } {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    SHEET_NAMES.FeedingLogs,
  );
  const date = new Date(sheet.getRange("B3").getValue());
  const amPM: "AM" | "PM" = sheet.getRange("C3").getValue();
  return { date, amPM };
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

function getAllFeedingLogs(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  filter: {
    date: Date;
    amPM: "AM" | "PM";
    allowedStatusValues: Array<"Y" | "H" | "N" | "?" | "">;
  },
): {
  timestamp: number;
  date: Date;
  amPM: "AM" | "PM";
  catName: string;
  status: string;
  foods: { name: string; status: string }[];
}[] {
  const dateStringFilter = getDateStringFromDate(filter.date);
  return sheet
    .getRange("B3:E")
    .getValues()
    .map((row, i) => ({ i, date: row[0], amPM: row[1], overallStatus: row[3] }))
    .filter(
      ({ date, amPM, overallStatus }) =>
        date &&
        amPM &&
        getDateStringFromDate(date) === dateStringFilter &&
        amPM === filter.amPM &&
        filter.allowedStatusValues.indexOf(overallStatus) >= 0,
    )
    .map(({ i }) => i + 3)
    .map(index => getFeedingLogItem(sheet, index));
}

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

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////// -=-FORM STUFF-=- ////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function setupRecordingForm() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const config = spreadsheet.getSheetByName("_config");
  const FORM_URL = config.getRange("A1").getValue();

  let form: GoogleAppsScript.Forms.Form;
  if (FORM_URL === "") {
    form = FormApp.create("Food Recording Form");
    config.getRange("A1").setValue(form.getPublishedUrl());
  } else {
    form = FormApp.openByUrl(FORM_URL);
  }

  const sheet = spreadsheet.getSheetByName("Feeding Logs");

  form.deleteAllResponses();
  form.getItems().forEach(item => form.deleteItem(item));
  form.setTitle("Food Recording Form");

  const feedingData = getAllFeedingsWithQuestionMarks(sheet);
  const byPrettyDate = feedingData.reduce(
    (byPrettyDate, item) => {
      const prettyDate = convertDateAmPmIntoPrettyDate(item.date, item.amPM);
      return {
        ...byPrettyDate,
        [prettyDate]: [...(byPrettyDate[prettyDate] || []), item],
      };
    },
    {} as { [prettyDate: string]: FeedingLogItem[] },
  );

  Object.keys(byPrettyDate).forEach(prettyDate => {
    form
      .addGridItem()
      .setTitle(`${prettyDate} Feeding`)
      .setRows(
        byPrettyDate[prettyDate].reduce(
          (all, item) => {
            return [...all, ...item.foods.map(({ name }) => `${item.catName} - ${name}`)];
          },
          [] as string[],
        ),
      )
      .setColumns(["Yes", "Half", "No"])
      .setRequired(true);
  });
}

//////////////////////////////////////////////////////

function getAllFeedingsWithQuestionMarks(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  return sheet
    .getRange("E3:E")
    .getValues()
    .map((row, i) => ({ i, value: row[0] }))
    .filter(({ value }) => value === "?")
    .map(({ i }) => i + 3)
    .map(i => getFeedingLogItem(sheet, i));
}

function convertDateAmPmIntoPrettyDate(date: Date, amPM: "AM" | "PM"): string {
  return (
    date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear() + " " + amPM
  );
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
