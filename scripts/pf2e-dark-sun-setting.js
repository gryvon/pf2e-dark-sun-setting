Hooks.once('init', () => {
	loadTemplates([
		'modules/pf2e-dark-sun-setting/templates/rest-for-the-night.hbs',
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