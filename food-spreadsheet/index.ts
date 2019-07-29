const CONSTANTS_OLD = {
  SHEET_NAMES: {
    BoardingSchedule: "Boarding Schedule",
    AllCatsInStore: "_private_all_cats_at_store",
    FeedingLogs: "Feeding Logs",
  },
};

type BoardingScheduleSchema = {
  "Cat Name": string;
  "Start Date": Date;
  "End Date": Date;
  "Dietary Restrictions": string;
  "Other Notes": string;
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

function generateDistributionForm() {
  Logger.log("starting");
  var form = FormApp.openByUrl(
    "https://docs.google.com/forms/d/1GG1NsHHXGsgI1sAXxJyXW9hZ-ZCGgYBx1bdcBSAPmqs/edit"
  );
  form.deleteAllResponses();
  form.getItems().forEach(item => form.deleteItem(item));
  form.setTitle("Food Distribution Form");
  form
    .addTextItem()
    .setTitle("Chef for 7/20/2019 AM")
    .setRequired(true);

  Logger.log("form opened");

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
          otherNotes: "I AM OTHER NOTE",
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
      // form.addParagraphTextItem().setTitle(`Other Notes For ${data.name}`);
    });
  Logger.log("done with iteration");
  Logger.log(form.getEditUrl());

  Logger.log(form.getPublishedUrl());
}

function generateRecordingForm() {
  var form = FormApp.openByUrl(
    "https://docs.google.com/forms/d/1ZXh5fvWS-kpAzAJAGDOIaHMR6WksKolkeYaya7QcyLU/edit"
  );
  form.deleteAllResponses();
  form.getItems().forEach(item => form.deleteItem(item));
  form.setTitle("Food Recording Form");

  // form
  //   .addTextItem()
  //   .setTitle("Chef for 7/20/2019 AM")
  //   .setRequired(true);

  Logger.log("form opened");

  function createMCQuestionForFood(
    catName: string,
    foodName: string,
    prettyDate: string
  ) {
    const item = form.addMultipleChoiceItem();
    item.setTitle(`Did '${catName}' eat all of the '${foodName}' on ${prettyDate}?`);
    item.setChoices([
      item.createChoice("Yes"),
      item.createChoice("Half"),
      item.createChoice("No"),
    ]);
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

/////////////////////////////////////////////////////////////
// function getAllCatsInStore() {
//   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
//     CONSTANTS.SHEET_NAMES.AllCatsInStore
//   );
//   return getTableDataFromSheetAsArrOfObj<CatSchema>(sheet).filter(({ name }) =>
//     Boolean(name)
//   );
// }

// function getAllFeedingsWithQuestionMark() {
//   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
//     CONSTANTS.SHEET_NAMES.FeedingLogs
//   );

//   const data: {
//     timestamp: string;
//     date: Date;
//     amPM: string;
//     catName: string;
//     status: string;
//     foods: { name: string; status: string }[];
//   }[] = sheet
//     .getRange("E3:E")
//     .getValues()
//     .map((row, i) => ({ i, value: row[0] }))
//     .filter(({ value }) => value === "?")
//     .map(({ i }) => i + 3)
//     .map(index => {
//       const [
//         timestamp,
//         date,
//         amPM,
//         catName,
//         status,
//         food1,
//         food1Status,
//         food2,
//         food2Status,
//         food3,
//         food3Status,
//         food4,
//         food4Status,
//       ] = sheet.getRange(index, 1, 1, 13).getValues()[0];

//       const foods = [];

//       if (food1Status === "?") {
//         foods.push({ name: food1, status: food1Status });
//         if (food2Status === "?") {
//           foods.push({ name: food2, status: food2Status });
//           if (food3Status === "?") {
//             foods.push({ name: food3, status: food3Status });
//             if (food4Status === "?") {
//               foods.push({ name: food4, status: food4Status });
//             }
//           }
//         }
//       }

//       return {
//         timestamp,
//         date,
//         amPM,
//         catName,
//         status,
//         foods,
//       };
//     });

//   return data;
// }

// function getTableDataFromSheetAsArrOfObj<T extends {}>(
//   sheet: GoogleAppsScript.Spreadsheet.Sheet
// ): T[] {
//   const [headers, ...data] = sheet.getDataRange().getValues();
//   return data.map(row => headers.reduce((o, header, i) => ({ ...o, [header]: row[i] })));
// }

// type FoodHistoryData = {
//   [foodName: string]: { yes: number; no: number };
// };

// function makeYesNoBarGraph(data: FoodHistoryData): GoogleAppsScript.Charts.Chart {
//   const maxTotalFeedings = Object.keys(data).reduce((max: number, foodName: string) => {
//     const thisRow = data[foodName];
//     return Math.max(
//       max,
//       Object.keys(thisRow)
//         .map(k => thisRow[k])
//         .reduce((a, b) => a + b, 0)
//     );
//   }, 0);
//   let dataTableBuilder = Charts.newDataTable()
//     .addColumn(Charts.ColumnType.STRING, "Month")
//     .addColumn(Charts.ColumnType.NUMBER, "Yes")
//     // .addColumn(Charts.ColumnType.NUMBER, 'Half')
//     .addColumn(Charts.ColumnType.NUMBER, "No");

//   Object.keys(data).forEach(foodName => {
//     dataTableBuilder = dataTableBuilder.addRow([
//       foodName,
//       data[foodName].yes,
//       data[foodName].no,
//     ]);
//   });

//   const chart = Charts.newBarChart()
//     .setDataTable(dataTableBuilder as GoogleAppsScript.Charts.DataTableBuilder)
//     .setStacked()
//     .setRange(0, maxTotalFeedings)
//     .setColors(["green", "red"])
//     .build();

//   // const imageData = Utilities.base64Encode(chart.getAs('image/png').getBytes());
//   // const imageUrl = 'data:image/png;base64,' + encodeURI(imageData);
//   // Logger.log(imageUrl);
//   return chart;
// }
