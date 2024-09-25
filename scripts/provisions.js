

Hooks.once('init', () => {
	// Register Templates for the "Rest for Night" dialog and the Food/Resource
	// Points Tracker on the Dialog.
	loadTemplates([
		'modules/pf2e-dark-sun-setting/templates/rest-for-the-night.hbs',
		'modules/pf2e-dark-sun-setting/templates/party-resources.hbs',
	]);
});

Hooks.once("ready", async () => {
	// Ready Socket Listener.
	game.socket.on('module.pf2e-dark-sun-setting', (data) => {
		if (data.operation === 'restForTheNight') handleRestForNightSocket(data);
		if (data.operation === 'consumeFoodPoints') handleConsumeFoodPointsSocket(data);
	})
});

// Adds Food Points and Resource Points to Party Sheet.
Hooks.on("renderPartySheetPF2e", async (party, html, actor) => {
 	// Path to custom template.
	const tpl = 'modules/pf2e-dark-sun-setting/templates/party-resources.hbs';

	// Render the data into the template's handlebars.
	const isGM = game.user.isGM;
	const myHtml = await renderTemplate(tpl, { actor, isGM });

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

Hooks.on("pf2e.restForTheNight", async (character) => {
	console.log(character);
	if (character.type != "character") { return; }

	const actor = game.actors.get(character._id)

	// GM is calling rest. Send socket for player.
	if (game.user.isGM) {
		console.log(`Emitting rest for night socket to ${character.name}`);
		game.socket.emit('module.pf2e-dark-sun-setting', {
		    operation: "restForTheNight",
		    actor: actor
		});
		return;
	}

	if (actor.isOwner) {
		restForNightDialog(actor);
		return;
	}
});

// Consume food points. Handled by socket to GM because player cannot edit Party Sheet values.
async function handleConsumeFoodPointsSocket(data) {
	const actor = game.actors.get(data.actor._id);
	const party = actor.parties.first();
	const foodAdjustment = foodRequiredBySize(actor);

	await adjustFood(party, -foodAdjustment);

	sendChatMessage(actor, `${actor.name} has consumed ${foodAdjustment} Food Points.`)
}

// Received a Rest For Night Socket.
async function handleRestForNightSocket(data) {
	console.log("Received Rest For Night Socket");
	console.log(data);
	if (!data.actor.type == "character") { console.log("Not a PC."); return; } // This actor is not a PC.
	
	const user = game.user;
	const actor = game.actors.get(data.actor._id);

	if (!actor.isOwner) { console.log("Socket not for me."); return; } // This socket is not for this user.

	await restForNightDialog(actor);
}

async function restForNightDialog(actor) {
	// Get the Rest for Night Dialog ready.
	const tpl = 'modules/pf2e-dark-sun-setting/templates/rest-for-the-night.hbs';
	const foodRequired = foodRequiredBySize(actor);
	const myHtml = await renderTemplate(tpl, { actor, foodRequired });

	// Popup the Dialog.
	new Dialog({
		title: "Resting for the Night",
		content: myHtml,
		buttons: {
			button1: {
				label: "Eat Provisions",
				callback: () => { eatFood(actor) },
				icon: `<i class="fas fa-check"></i>`
			},
	    button2: {
	      label: "Make a Starvation Check",
	      callback: () => { starve(character) },
	      icon: `<i class="fas fa-times"></i>`
			}
		},
		"default": "button1"
	}).render(true);	
}

// Returns amount of Food Points an actor needs, depending on it's size
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

// Eat Food from party sheet.
async function eatFood(character) {
	const foodRequired = foodRequiredBySize(character);
	const party = character.parties.first();
	const foodOnHand = party.system.darkSun.foodPoints;

	if (foodRequired > foodOnHand) {
		ui.notifications.info("You don't have enough food points.");
		starve(character);
		return;
	}

	game.socket.emit('module.pf2e-dark-sun-setting', {
	    operation: "consumeFoodPoints",
	    actor: character
	});
}

// Starvation check logic.
async function starve(character) { 
	const effectUuid = "Compendium.pf2e-dark-sun-setting.dark-sun-effects.Item.QwvGFwLQMEpMOCpY";
	const level = character.level;
	const dc = getDCByLevel(level);

	const roll = await character.saves.fortitude.roll({ dc: dc });

	let existingEffect = character.items.find(i => i.sourceId === effectUuid);

	if (roll.options.degreeOfSuccess <= 1) {
		if (existingEffect) {
			let newBadgeValue = (existingEffect.system.badge?.value || 1) + 1;
			await existingEffect.update({"system.badge.value": newBadgeValue});
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

// Dialog for adjusting food points.
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
	  return;
	}
	await adjustFood(party, foodAdjustment);
}

// Dialog for adjusting resource points.
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