Hooks.once('init', () => {
	// Register Game Settings. 
  registerSettings();
  // Sexy console logo.
	console.log(`
    ___           _      __                     
   /   \\__ _ _ __| | __ / _\\_   _ _ __          
  / /\\ / _  | '__| |/ / \\ \\| | | | '_ \\         
 / /_// (_| | |  |   <  _\\ \\ |_| | | | |        
/___,' \\__,_|_|  |_|\\_\\ \\__/\\__,_|_| |_|`);
})

Hooks.once("ready", async () => {
	addWildTalents();
	await releaseAnnouncement();
});

function registerSettings() {
  game.settings.register("pf2e-dark-sun-setting", "releaseAnnouncement", {
    name: "Release Announcement",
    hint: "Display the Dark Sun module's release announcement next time you log in.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register("pf2e-dark-sun-setting", "resetCompendiumLoaders", {
    name: "Reset Compendium Browser Settings",
    hint: "Reset the Compendium Browser to only display options from Dark Sun sources. (Requires Reload!)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    // onChange: value => { if (value == true) { resetCompendiumLoaders(); } }
    requiresReload: true
  });
};

// Adds Wild Talents as campaign feats for players.
function addWildTalents() {
	// This only needs to be ran by the GM.
	if (!game.user.isGM) { return; }

	const campaignFeatSections = game.settings.get("pf2e", "campaignFeatSections");
	campaignFeatSections.push({
		id: "pf2e-dark-sun-setting-wild-talents",
		label: "Wild Talents",
		supported: ["ancestry"],
		slots: [1, 5, 9, 13, 17]
	});
	game.settings.set("pf2e", "campaignFeatSections", campaignFeatSections);
}

// Pop Up Release Announcement.
async function releaseAnnouncement() {
    if (game.settings.get("pf2e-dark-sun-setting", "releaseAnnouncement")) {
      const journal = await fromUuid("Compendium.pf2e-dark-sun-setting.dark-sun-journals.JournalEntry.eOYi5mTvgYnGfZRX")
      journal.sheet.render(true)
      await game.settings.set("pf2e-dark-sun-setting", "releaseAnnouncement", false)
    }
}