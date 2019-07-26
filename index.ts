const CONSTANTS = {
  SHEET_NAMES: {
    BoardingSchedule: 'Boarding Schedule',
    AllCatsInStore: '_private_all_cats_at_store',
  },
};

type BoardingScheduleSchema = {
  'Cat Name': string;
  'Start Date': Date;
  'End Date': Date;
  'Dietary Restrictions': string;
  'Other Notes': string;
};

type CatSchema = {
  adoptOrBoard: 'Adopt' | 'Board';
  name: string;
  startDate: Date;
  endDate: Date;
  daysHere: number;
  daysLeft: number;
  hereUntil: string;
};

function getFoodOrderForm() {
  Logger.log('starting');
  var form = FormApp.openByUrl(
    'https://docs.google.com/forms/d/1GG1NsHHXGsgI1sAXxJyXW9hZ-ZCGgYBx1bdcBSAPmqs/edit',
  );
  form.getItems().forEach(item => form.deleteItem(item));
  // form.setTitle('Today Feeding');

  Logger.log('form opened');

  getAllCatsInStore()
    .map(
      (
        cat: CatSchema,
      ): {
        name: string;
        dietRestrictions?: string;
        otherNotes?: string;
        favoriteFoods?: FoodHistoryData;
      } => {
        Logger.log(`processing: ${cat.name}`);
        return {
          name: cat.name,
          dietRestrictions: 'TODO DIET RESTRICTION',
          otherNotes: 'I AM OTHER NOTE',
          favoriteFoods: {
            'Food A': { yes: 10, no: 2 },
            'Food B': { yes: 8, no: 3 },
            'Food C': { yes: 5, no: 4 },
          },
        };
      },
    )
    .forEach(data => {
      form.addPageBreakItem().setTitle(data.name);
      form
        .addImageItem()
        .setTitle('Food for past X')
        .setImage(makeYesNoBarGraph(data.favoriteFoods).getBlob());
      form.addTextItem().setTitle(`${data.name}'s Food`);
      // form.addParagraphTextItem().setTitle(`Other Notes For ${data.name}`);
    });
  Logger.log('done with iteration');
  Logger.log(form.getEditUrl());

  Logger.log(form.getPublishedUrl());
}

function testMakeChart() {}

/////////////////////////////////////////////////////////////
function getAllCatsInStore() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONSTANTS.SHEET_NAMES.AllCatsInStore,
  );
  return getTableDataFromSheetAsArrOfObj<CatSchema>(sheet).filter(({ name }) =>
    Boolean(name),
  );
}

function getTableDataFromSheetAsArrOfObj<T extends {}>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): T[] {
  const [headers, ...data] = sheet.getDataRange().getValues();
  return data.map(row => headers.reduce((o, header, i) => ({ ...o, [header]: row[i] })));
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
        .reduce((a, b) => a + b, 0),
    );
  }, 0);
  let dataTableBuilder = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, 'Month')
    .addColumn(Charts.ColumnType.NUMBER, 'Yes')
    // .addColumn(Charts.ColumnType.NUMBER, 'Half')
    .addColumn(Charts.ColumnType.NUMBER, 'No');

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
    .setColors(['green', 'red'])
    .build();

  // const imageData = Utilities.base64Encode(chart.getAs('image/png').getBytes());
  // const imageUrl = 'data:image/png;base64,' + encodeURI(imageData);
  // Logger.log(imageUrl);
  return chart;
}
