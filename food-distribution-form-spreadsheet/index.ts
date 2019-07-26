type FoodDistributionData = {
  [catName: string]: {
    food1: string;
    food2?: string;
    food3?: string;
    food4?: string;
  };
};
function onFormSubmit(event: GoogleAppsScript.Events.FormsOnSubmit) {
  Logger.log(event);
  const { namedValues } = event;
  Logger.log(namedValues);
  const foodDistributionData: FoodDistributionData = Object.keys(namedValues as object)
    .map(key => {
      const match = key.match(/(\w+)\'s Food/);
      Logger.log(match);
      const [food1, food2, food3, food4, ...rest] = namedValues[key][0].split(
        /\s*[\/\-\,]\s*/,
      );
      Logger.log(food1);
      Logger.log(food2);
      Logger.log(food3);
      Logger.log(food4);
      Logger.log(rest);

      return match && match[1]
        ? { name: match[1], value: { food1, food2, food3, food4 } }
        : null;
    })
    .filter(value => value && value.value.food1)
    .reduce((obj, { name, value }) => ({ ...obj, [name]: value }), {});

  const sheet = SpreadsheetApp.openById(
    '1gQNMd06hj6Lsh1OPWKC1L0wgc12aqiNroR97XV-D2cI',
  ).getSheetByName('Test');

  sheet.getRange(1, 1).setValue(JSON.stringify(foodDistributionData, null, 4));
}
