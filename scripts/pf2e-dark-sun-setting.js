Hooks.once('init', () => {
	loadTemplates([
		'modules/pf2e-dark-sun-setting/templates/rest-for-the-night.hbs',
		'modules/pf2e-dark-sun-setting/templates/party-resources.hbs',
	]);
	console.debug("pf2e-dark-sun-setting | Initialized.")
});

Hooks.once("ready", async () => {
	const campaignFeatSections = game.settings.get("pf2e", "campaignFeatSections");
	campaignFeatSections.push({
		id: "pf2e-dark-sun-setting-wild-talents",
		label: "Wild Talents",
		supported: ["ancestry"],
		slots: [1, 5, 9, 13, 17]
	});
	game.settings.set("pf2e", "campaignFeatSections", campaignFeatSections);
});

Hooks.on("pf2e.restForTheNight", async (character) => {
	console.log("Rest for Night Hook Triggered.");

	const tpl = 'modules/pf2e-dark-sun-setting/templates/rest-for-the-night.hbs';
	const myHtml = await renderTemplate(tpl, { character });

	new Dialog({
	  title: "Resting for the Night",
	  content: myHtml,
  buttons: {
    button1: {
      label: "Yes!",
      callback: () => { eatFood(character) },
      icon: `<i class="fas fa-check"></i>`
    },
    button2: {
      label: "No!!!",
      callback: () => { starve(character) },
      icon: `<i class="fas fa-times"></i>`
    }
  },
  default: "button1"}).render(true);
});

async function eatFood(character) {
	console.log(character);

	let foodRequired = 1;
	const characterSize = character.system.traits.size.value;

	if (characterSize == "sm") {
		foodRequired = 0.5;
	}
	else if (characterSize == "lg") {
		foodRequired = 4;
	}

	const party = character.parties.first();

	if (!party.hasOwnProperty('darkSun')) {
		party.darkSun = {
			foodPoints: 0,
			resourcePoints: 0
		}
	}

	if (party.darkSun.foodPoints <= foodRequired) {
		ui.notifications.info("You don't have enough food points.");
		starve(character);
		return;
	}

	party.darkSun.foodPoints -= foodRequired;
}

async function starve(character) { 
	const effectUuid = "Compendium.pf2e-dark-sun-setting.dark-sun-effects.Item.fjXlMjzWT1e7BLB9";
	const level = character.level;
	const dc = getDCByLevel(level);

	const roll = await character.saves.fortitude.roll({ dc: dc });

	let existingEffect = character.items.find(i => i.sourceId === effectUuid);

	if (roll.options.degreeOfSuccess <= 1) {
		if (existingEffect) {
			let newBadgeValue = (existingEffect.system.badge?.value || 1) + 1;
			await existingEffect.update({ "system.badge.value": newBadgeValue });
		}
		else {
			const effect = await getEffect(effectUuid);
			await character.createEmbeddedDocuments("Item", [effect]);
		}
		sendChatMessage(character, `${character.name} has failed the starvation check.`)
	}
	else {
		sendChatMessage(character, `${character.name} has succeeded the starvation check.`)
	}
}

// Retrieve the thirsty effect from the compendium.
async function getEffect(uuid) {
	return await fromUuid(uuid);
}


// Get the standard DC by level.
function getDCByLevel(level) {
	return level + Math.floor(level / 3) + 14
}

function sendChatMessage(character, content) {
    ChatMessage.create({
        speaker: { actor: character._id },  // Send message as the character
        content: content  // The message content
    });
}

Hooks.on("renderPartySheetPF2e", async (party, html, actor) => {
	console.log("Party sheet detected!")

	// Path to custom template.
	const tpl = 'modules/pf2e-dark-sun-setting/templates/party-resources.hbs';

	// Render the data into the template's handlebars.
	const myHtml = await renderTemplate(tpl, { actor });

	// Find the inventory portion.
	const target = $(html).find('div.summary-data');

	target.append(myHtml);

})


////////////////////////////

async function adjustmentFoodDialog(party) {
	let foodAdjustment;
	try {
	  foodAdjustment = await foundry.applications.api.DialogV2.prompt({
	    window: { title: "How much would you like to adjust the Food Points?" },
	    content: '<input name="adj" type="number" autofocus>',
	    ok: {
	      label: "Submit",
	      callback: (event, button, dialog) => button.form.elements.guess.valueAsNumber
	    }
	  });
	} catch {
	  //console.log("User did not make a guess.");
	  return;
	}
	adjustFood(party, foodAdjustment);
}

Hooks.on("darksun.adjustmentFoodDialog"), async (party) => {
  await adjustmentFoodDialog(party)
}

async function adjustFood(party, value) {
  if (!party.hasOwnProperty('darkSun')) {
    party.system.darkSun = {
      foodPoints: 0,
      resourcePoints: 0
    }
  }

  let newFoodValue = (party.darkSun.system.foodPoints || 0) + value;
  await party.update({ "darkSun.system.foodPoints": newFoodValue });
}