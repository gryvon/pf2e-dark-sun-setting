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
      label: "Eat Provisions",
      callback: () => { eatFood(character) },
      icon: `<i class="fas fa-check"></i>`
    },
    button2: {
      label: "Make a Starvation Check",
      callback: () => { starve(character) },
      icon: `<i class="fas fa-times"></i>`
    }
  },
  default: "button1"}).render(true);
});

function foodRequiredBySize(character) {
	const characterSize = character.system.traits.size.value;
	if (characterSize == "sm") {
		return 0.5;
	}
	if (characterSize == "lg") {
		return 4;
	}
	return 1;
}

async function eatFood(character) {
	const foodRequired = foodRequiredBySize(character);
	const party = character.parties.first();
	const foodOnHand = party.system.darkSun.foodPoints;

	if (foodRequired > foodOnHand) {
		ui.notifications.info("You don't have enough food points.");
		starve(character);
		return;
	}	

	party.update({'system.darkSun.foodPoints': foodOnHand - foodRequired});
	sendChatMessage(character, `${character.name} has consumed ${foodRequired} food points.`);
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


// Get a good-enough standard DC by level.
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

  html.find(".foodPoints").click(async (event) => {
      await adjustmentFoodDialog(party.actor._id);
  });

  html.find(".resourcePoints").click(async (event) => {
      await adjustmentResourceDialog(party.actor._id);
  });


})

async function adjustmentFoodDialog(actorId) {
	const party = game.actors.get(actorId);
	let foodAdjustment;
	try {
	  foodAdjustment = await foundry.applications.api.DialogV2.prompt({
	    window: { title: "How much would you like to adjust the Food Points?" },
	    content: '<input name="adj" type="number" autofocus>',
	    ok: {
	      label: "Submit",
	      callback: (event, button, dialog) => button.form.elements.adj.valueAsNumber
	    }
	  });
	} catch {
	  //console.log("User did not make a guess.");
	  return;
	}
	await adjustFood(party, foodAdjustment);
}

async function adjustmentResourceDialog(actorId) {
	const party = game.actors.get(actorId);
	let foodAdjustment;
	try {
	  foodAdjustment = await foundry.applications.api.DialogV2.prompt({
	    window: { title: "How much would you like to adjust the Resource Points?" },
	    content: '<input name="adj" type="number" autofocus>',
	    ok: {
	      label: "Submit",
	      callback: (event, button, dialog) => button.form.elements.adj.valueAsNumber
	    }
	  });
	} catch {
	  //console.log("User did not make a guess.");
	  return;
	}
	await adjustResources(party, foodAdjustment);
}

async function adjustFood(party, value) {
  if (!party.system.hasOwnProperty('darkSun')) {
    party.system.darkSun = {
      foodPoints: 0,
      resourcePoints: 0
    }
  }

  let newFoodValue = (party.system.darkSun.foodPoints || 0) + value;
  await party.update({ "system.darkSun.foodPoints": newFoodValue });
}

async function adjustResources(party, value) {
  if (!party.system.hasOwnProperty('darkSun')) {
    party.system.darkSun = {
      foodPoints: 0,
      resourcePoints: 0
    }
  }

  let newResourcesValue = (party.system.darkSun.resourcePoints || 0) + value;
  await party.update({ "system.darkSun.resourcePoints": newResourcesValue });
}