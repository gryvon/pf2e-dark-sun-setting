// import { ActorPF2e } from "@actor";

Hooks.once('init', () => {
	console.debug("pf2e-dark-sun-setting | Initialized.")

});

Hooks.once("ready", async () => {
	//phase = Phase.SETUP;
	const campaignFeatSections = game.settings.get("pf2e", "campaignFeatSections");
	campaignFeatSections.push({
		id: "pf2e-dark-sun-setting-wild-talents",
		label: "Wild Talents",
		supported: ["ancestry"],
		slots: [1, 5, 9, 13, 17]
	});
	game.settings.set("pf2e", "campaignFeatSections", campaignFeatSections);
})