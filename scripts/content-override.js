Hooks.once("ready", async() => {
    await resetCompendiumBrowser();
})

// Override links for ABCD search on character sheet to open Dark Sun compendiums.
Hooks.on("renderCharacterSheetPF2e", async (party, html, actor) => {

    let ancestryElement = html.find('a[data-action="open-compendium"][data-compendium="pf2e.ancestries"]');
    ancestryElement.replaceWith('<a data-action="open-compendium" data-compendium="pf2e-dark-sun-setting.dark-sun-ancestries"><i class="fa-solid fa-fw fa-search"></i></a>')

    let heritageElement = html.find('a[data-action="open-compendium"][data-compendium="pf2e.heritages"]');
    heritageElement.replaceWith('<a data-action="open-compendium" data-compendium="pf2e-dark-sun-setting.dark-sun-heritages"><i class="fa-solid fa-fw fa-search"></i></a>')

    let backgroundElement = html.find('a[data-action="open-compendium"][data-compendium="pf2e.backgrounds"]');
    backgroundElement.replaceWith('<a data-action="open-compendium" data-compendium="pf2e-dark-sun-setting.dark-sun-backgrounds"><i class="fa-solid fa-fw fa-search"></i></a>')

    let classElement = html.find('a[data-action="open-compendium"][data-compendium="pf2e.classes"]');
    classElement.replaceWith('<a data-action="open-compendium" data-compendium="pf2e-dark-sun-setting.dark-sun-classes"><i class="fa-solid fa-fw fa-search"></i></a>')

    let deityElement = html.find('a[data-action="open-compendium"][data-compendium="pf2e.deities"]');
    deityElement.replaceWith('<a data-action="open-compendium" data-compendium="pf2e-dark-sun-setting.dark-sun-deities"><i class="fa-solid fa-fw fa-search"></i></a>')

});

// Resets compendium browser sources to Dark Sun content only.
async function resetCompendiumBrowser() {
  if (game.user.isGM) {
    if (game.settings.get("pf2e-dark-sun-setting", "resetCompendiumLoaders")) {
        await resetCompendiumLoaders();
        await game.settings.set("pf2e-dark-sun-setting", "resetCompendiumLoaders", false)
    }
  }
}
// Disable all non-Dark Sun and non-Neccessary sources from Compendium Browser.
async function resetCompendiumLoaders() {
    const browser = game.pf2e.compendiumBrowser.settings;
    const cats = [
        'action', 
        'bestiary', 
        'campaignFeature', 
        'equipment', 
        'feat', 
        'hazard', 
        'spell'];
    const pf2eSources = [
        "pf2e.actionspf2e",
        "pf2e.familiar-abilities",
        "xdy-pf2e-workbench.xdy-pf2e-workbench-items",
        "pf2e.bestiary-ability-glossary-srd",
        "pf2e.bestiary-family-ability-glossary",
        "pf2e.adventure-specific-actions"
    ];
    let key;
    cats.forEach(category => {
        if (browser[category]) {
            let keys = Object.keys(browser[category]);
            for (key of keys) {
                let source = browser[category][key];
                if (source.package == "pf2e-dark-sun-setting") {
                    source.load = true;
                }
                else {
                    if (pf2eSources.includes(key)) {
                        source.load = true;
                    }
                    else {
                        source.load = false;
                    }
                }
            }    
        }
    });
    await game.settings.set("pf2e-dark-sun-setting", "resetCompendiumLoaders", false)
}