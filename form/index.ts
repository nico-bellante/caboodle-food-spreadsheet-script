// function setupRecordingForm() {
//   const form = FormApp.getActiveForm();
//   let sheet: GoogleAppsScript.Spreadsheet.Sheet = SpreadsheetApp.openById(
//     "1gQNMd06hj6Lsh1OPWKC1L0wgc12aqiNroR97XV-D2cI",
//   ).getSheetByName("Feeding Logs");

//   form.deleteAllResponses();
//   form.getItems().forEach(item => form.deleteItem(item));
//   form.setTitle("Food Recording Form");

//   const feedingData = getAllFeedingsWithQuestionMarks(sheet);
//   const byPrettyDate = feedingData.reduce(
//     (byPrettyDate, item) => {
//       const prettyDate = convertDateAmPmIntoPrettyDate(item.date, item.amPM);
//       return {
//         ...byPrettyDate,
//         [prettyDate]: [...(byPrettyDate[prettyDate] || []), item],
//       };
//     },
//     {} as { [prettyDate: string]: FeedingLogItem[] },
//   );

//   Object.keys(byPrettyDate).forEach(prettyDate => {
//     form
//       .addGridItem()
//       .setTitle(`${prettyDate} Feeding`)
//       .setRows(
//         byPrettyDate[prettyDate].reduce(
//           (all, item) => {
//             return [...all, ...item.foods.map(({ name }) => `${item.catName} - ${name}`)];
//           },
//           [] as string[],
//         ),
//       )
//       .setColumns(["Yes", "Half", "No"])
//       .setRequired(true);
//   });
// }

// //////////////////////////////////////////////////////

// function getAllFeedingsWithQuestionMarks(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
//   return sheet
//     .getRange("E3:E")
//     .getValues()
//     .map((row, i) => ({ i, value: row[0] }))
//     .filter(({ value }) => value === "?")
//     .map(({ i }) => i + 3)
//     .map(i => getFeedingLogItem(sheet, i));
// }

// type FeedingLogItem = {
//   timestamp: number;
//   date: Date;
//   amPM: "AM" | "PM";
//   catName: string;
//   status: string;
//   foods: { name: string; status: string }[];
// };

// function getFeedingLogItem(
//   sheet: GoogleAppsScript.Spreadsheet.Sheet,
//   index: number,
// ): FeedingLogItem {
//   const {
//     timestamp,
//     date,
//     amPM,
//     catName,
//     status,
//     food1,
//     food1Status,
//     food2,
//     food2Status,
//     food3,
//     food3Status,
//     food4,
//     food4Status,
//   } = getRowOfFeedingLog(sheet, index);
//   const foods = [];

//   if (food1Status && food1Status !== "--") {
//     foods.push({ name: food1, status: food1Status });
//     if (food2Status && food2Status !== "--") {
//       foods.push({ name: food2, status: food2Status });
//       if (food3Status && food3Status !== "--") {
//         foods.push({ name: food3, status: food3Status });
//         if (food4Status && food4Status !== "--") {
//           foods.push({ name: food4, status: food4Status });
//         }
//       }
//     }
//   }

//   return {
//     timestamp,
//     date,
//     amPM,
//     catName,
//     status,
//     foods,
//   };
// }

// function getDateStringFromDate(date: Date) {
//   return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
// }

// type FeedingLogRowOfData = {
//   timestamp: number;
//   date: Date;
//   amPM: "AM" | "PM";
//   catName: string;
//   status: string;
//   food1: string;
//   food1Status: string;
//   food2: string;
//   food2Status: string;
//   food3: string;
//   food3Status: string;
//   food4: string;
//   food4Status: string;
// };

// function getRowOfFeedingLog(
//   sheet: GoogleAppsScript.Spreadsheet.Sheet,
//   index: number,
// ): FeedingLogRowOfData {
//   // addLogToLogSheet(sheet.getRange(index, 1, 1, 13).getValues()[0], "feedingrowlog");
//   const [
//     timestamp,
//     date,
//     amPM,
//     catName,
//     _,
//     food1,
//     food1Status,
//     food2,
//     food2Status,
//     food3,
//     food3Status,
//     food4,
//     food4Status,
//   ] = sheet.getRange(index, 1, 1, 13).getValues()[0];

//   const status = sheet.getRange(index, 5).getFormula();
//   return {
//     timestamp,
//     date,
//     amPM,
//     catName,
//     status,
//     food1,
//     food1Status,
//     food2,
//     food2Status,
//     food3,
//     food3Status,
//     food4,
//     food4Status,
//   };
// }

// function writeFeedingLogRowOfData(
//   sheet: GoogleAppsScript.Spreadsheet.Sheet,
//   index: number,
//   {
//     timestamp,
//     date,
//     amPM,
//     catName,
//     status,
//     food1,
//     food1Status,
//     food2,
//     food2Status,
//     food3,
//     food3Status,
//     food4,
//     food4Status,
//   }: FeedingLogRowOfData,
// ): void {
//   sheet
//     .getRange(index, 1, 1, 13)
//     .setValues([
//       [
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
//       ],
//     ]);
// }

// type RealFeedingRowData = {
//   timestamp: number;
//   date: string;
//   amPM: "AM" | "PM";
//   catName: string;
//   food1: string;
//   food2?: string;
//   food3?: string;
//   food4?: string;
// };

// function prepareFeedingRowData(data: RealFeedingRowData) {
//   const getQuestionMarkOrDash = (food?: string) => (food ? "?" : "--");
//   return [
//     new Date(data.timestamp).toISOString(),
//     data.date,
//     data.amPM,
//     data.catName,
//     '=IF(COUNTIF({G3,I3,K3,M3}, "Y"), "Y", (IF(COUNTIF({G3,I3,K3,M3}, "~?"),"?", "N")))',
//     data.food1,
//     getQuestionMarkOrDash(data.food1),
//     data.food2 || "--",
//     getQuestionMarkOrDash(data.food2),
//     data.food3 || "--",
//     getQuestionMarkOrDash(data.food3),
//     data.food4 || "--",
//     getQuestionMarkOrDash(data.food4),
//   ];
// }

// function convertDateAmPmIntoPrettyDate(date: Date, amPM: "AM" | "PM"): string {
//   return (
//     date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear() + " " + amPM
//   );
// }

// function convertPrettyDateIntoDateAmPm(
//   prettyDate: string,
// ): { date: Date; amPM: "AM" | "PM" } {
//   const dateRegex = /(\d\d?\s*\/\s*\d\d?\s*\/\s*\d\d\d\d)\s+(AM|PM)/;
//   const match = prettyDate.match(dateRegex);
//   const date = new Date(match![1]);
//   const amPM = match![2] as "AM" | "PM";
//   return { date, amPM };
// }
