export async function adjustmentFoodDialog(party) {
  let adj;
  try {
    foodAdjustment = await foundry.applcations.api.DialogV2.prompt({
      window: { title: "How much would you like to adjust the Food Points? "},
      content: '<input name="adj" type="number" autofocus>',
      ok: {
        label: "Submit",
        callback: (event, button, dialog) => await adjustFood(party, button.form.elements.adj.valueAsNumber);
      }
    });
  }
}

Hooks.on("darksun.adjustmentFoodDialog"), async (party) => {
  await adjustmentFoodDialog(party)
}



async function adjustFood(party, value) {

  if (!party.hasOwnProperty('darkSun')) {
    party.darkSun = {
      foodPoints: 0,
      resourcePoints: 0
    }
  }

  let newFoodValue = (party.darkSun.foodPoints || 0) + value;
  await party.update({ "darkSun.foodPoints": newFoodValue });
}