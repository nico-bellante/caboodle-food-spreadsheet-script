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

const FOOD_DASHBOARD_SPREADSHEET_ID =
  "1gQNMd06hj6Lsh1OPWKC1L0wgc12aqiNroR97XV-D2cI";

const FEEDING_LOGS_SHEET_NAME = "Feeding Logs";

type FoodDistributionData = {
  date: string;
  amPM: "AM" | "PM";
  chef: string;
  timestamp: number;
  data: {
    [catName: string]: {
      food1: string;
      food2?: string;
      food3?: string;
      food4?: string;
    };
  };
};

function onFormSubmit(event: GoogleAppsScript.Events.FormsOnSubmit) {
  Logger.log(event);
  const { namedValues } = event;
  Logger.log(namedValues);
  const dateRegex = /(\d\d?\s*\/\s*\d\d?\s*\/\s*\d\d\d\d)\s+(AM|PM)/;
  const dateKey = Object.keys(namedValues).find(key => key.match(dateRegex));
  const match = dateKey.match(dateRegex);
  const date = match[1];
  const amPM = match[2] as "AM" | "PM";
  const chef = namedValues[dateKey][0];
  const timestamp = Date.now();

  const foodDistributionData: FoodDistributionData = {
    date,
    amPM,
    chef,
    timestamp,
    data: Object.keys(namedValues)
      .map(key => {
        const match = key.match(/(\w+)\'s Food/);
        const [food1, food2, food3, food4, ...rest] = namedValues[key][0].split(
          /\s*[\/\-\,]\s*/
        );
        return match && match[1]
          ? { name: match[1], value: { food1, food2, food3, food4 } }
          : null;
      })
      .filter(
        result => result && result.value.food1 && result.value.food1 !== ""
      )
      .reduce((obj, { name, value }) => ({ ...obj, [name]: value }), {})
  };
  const sheet = SpreadsheetApp.openById(
    FOOD_DASHBOARD_SPREADSHEET_ID
  ).getSheetByName(FEEDING_LOGS_SHEET_NAME);
  // ).getSheetByName(FEEDING_LOGS_SHEET_NAME);
  Logger.log(JSON.stringify(foodDistributionData));

  function getQuestionMarkOrDash(food: string | undefined) {
    return food ? "?" : "-";
  }

  Object.keys(foodDistributionData.data).forEach(catName => {
    const { food1, food2, food3, food4 } = foodDistributionData.data[catName];
    const rowData = [
      new Date(foodDistributionData.timestamp).toISOString(),
      foodDistributionData.date,
      foodDistributionData.amPM,
      catName,
      '=IF(COUNTIF({G3,I3,K3,M3}, "Y"), "Y", (IF(COUNTIF({G3,I3,K3,M3}, "~?"),"?", "N")))',
      food1,
      getQuestionMarkOrDash(food1),
      food2 || "--",
      getQuestionMarkOrDash(food2),
      food3 || "--",
      getQuestionMarkOrDash(food3),
      food4 || "--",
      getQuestionMarkOrDash(food4)
    ];
    sheet
      .insertRowBefore(3)
      .getRange(3, 1, 1, rowData.length)
      .setValues([rowData]);
  });

  // sheet.getRange(1, 1).setValue(JSON.stringify(foodDistributionData, null, 4));
  // sheet
  //   .getRange(2, 1)
  //   .setValue(JSON.stringify(foodDistributionData.data, null, 4));
  // sheet.getRange(3, 1).setValue(JSON.stringify(namedValues, null, 4));
}
