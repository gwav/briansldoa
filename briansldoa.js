import {LDoAActor} from './modules/documents/ldoa_actor.js';
import LDoACombat from './modules/combat.js';
import {LDoAConfiguration} from './modules/configuration.js';
import {CLASSIC_ORIGINS} from './modules/constants.js';
import {runMigrations} from './modules/migrations.js';
import {LDoAItem} from './modules/documents/ldoa_item.js';
import CharacterSheet from './modules/sheets/character-sheet.js';
import ConsumableSheet from './modules/sheets/consumable-sheet.js';
import CreatureActionSheet from './modules/sheets/creature-action-sheet.js';
import CreatureSheet from './modules/sheets/creature-sheet.js';
import EquipmentSheet from './modules/sheets/equipment-sheet.js';
import GiftSheet from './modules/sheets/gift-sheet.js';
import OriginSheet from './modules/sheets/origin-sheet.js';
import DemonSheet from './modules/sheets/demon-sheet.js';
import SpellSheet from './modules/sheets/spell-sheet.js';
import SpiritSheet from './modules/sheets/spirit-sheet.js';
import WeaponSheet from './modules/sheets/weapon-sheet.js';
import {logDamageRoll, toggleAttributeTestDisplay} from './modules/chat_messages.js';
import {getBackgrounds, getOrigins} from './modules/origins.js';
import {capitalize, stringToKey} from './modules/shared.js';

async function preloadHandlebarsTemplates() {
    const paths = ["systems/briansldoa/templates/messages/attack-roll.hbs",
                   "systems/briansldoa/templates/messages/damage.hbs",
                   "systems/briansldoa/templates/messages/damage-roll.hbs",
                   "systems/briansldoa/templates/messages/demon-failure.hbs",
                   "systems/briansldoa/templates/messages/demon-success.hbs",
                   "systems/briansldoa/templates/messages/die-roll.hbs",
                   "systems/briansldoa/templates/messages/stressed.hbs",
                   "systems/briansldoa/templates/messages/stress-roll.hbs",
                   "systems/briansldoa/templates/messages/roll.hbs",
                   "systems/briansldoa/templates/messages/spirit-failure.hbs",
                   "systems/briansldoa/templates/messages/spirit-success.hbs",
                   "systems/briansldoa/templates/messages/usage-die-roll.hbs",
                   "systems/briansldoa/templates/partials/cs-attribute-list.hbs",
                   "systems/briansldoa/templates/partials/cs-background-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-background-tab-body.hbs",
                   "systems/briansldoa/templates/partials/cs-backgrounds-classic.hbs",
                   "systems/briansldoa/templates/partials/cs-base-attributes-list.hbs",
                   "systems/briansldoa/templates/partials/cs-consumable-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-demon-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-equipment-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-equipment-tab-body.hbs",
                   "systems/briansldoa/templates/partials/cs-fp-background-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-front-page-tab-body.hbs",
                   "systems/briansldoa/templates/partials/cs-gift-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-magic-tab-body.hbs",
                   "systems/briansldoa/templates/partials/cs-saga-tab-body.hbs",
                   "systems/briansldoa/templates/partials/cs-spell-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-spirit-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-story-entry.hbs",
                   "systems/briansldoa/templates/partials/cs-tab-bodies.hbs",
                   "systems/briansldoa/templates/partials/cs-tab-labels.hbs",
                   "systems/briansldoa/templates/partials/cs-weapon-entry.hbs",
                   "systems/briansldoa/templates/partials/cr-action-entry.hbs"];
    return(loadTemplates(paths))
}

Hooks.once("init", function() {
    console.log("Initializing the Last Days of Atlantis System.");

    CONFIG.Actor.documentClass  = LDoAActor;
    CONFIG.Combat.documentClass = LDoACombat;
    CONFIG.configuration        = LDoAConfiguration;
    CONFIG.Item.documentClass   = LDoAItem;

    game.settings.register("briansldoa", "customOrigins", {config:  true,
                                                                 default: false,
                                                                 hint:    game.i18n.localize("ldoa.settings.options.customOrigins.blurb"),
                                                                 name:    game.i18n.localize("ldoa.settings.options.customOrigins.title"),
                                                                 scope:   "world",
                                                                 type:    Boolean});

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("briansldoa", ConsumableSheet, {types: ["consumable"]});
    Items.registerSheet("briansldoa", CreatureActionSheet, {types: ["creature_action"]});
    Items.registerSheet("briansldoa", DemonSheet, {types: ["demon"]});
    Items.registerSheet("briansldoa", EquipmentSheet, {types: ["equipment"]});
    Items.registerSheet("briansldoa", GiftSheet, {types: ["gift"]});
    Items.registerSheet("briansldoa", OriginSheet, {types: ["origin"]});
    Items.registerSheet("briansldoa", SpellSheet, {types: ["spell"]});
    Items.registerSheet("briansldoa", SpiritSheet, {types: ["spirit"]});
    Items.registerSheet("briansldoa", WeaponSheet, {types: ["weapon"]});

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("briansldoa", CharacterSheet, {makeDefault: true, types: ["character"]});
    Actors.registerSheet("briansldoa", CreatureSheet, {makeDefault: true, types: ["creature"]});
    
    // Load templates.
    preloadHandlebarsTemplates();

    Handlebars.registerHelper("arrayIndexAdjuster", (index) => {
        return(`${index + 1}`);
    });

    Handlebars.registerHelper("backgroundSelect", function(offset, options) {
    	let backgrounds = {"": ""};
    	let labelKey    = `ldoa.fields.labels.${offset}Background`;
    	let context     = {field:    `../data.backgrounds.${offset}`,
                           labelKey: labelKey,
                           options:  backgrounds};

        for(var key in LDoAConfiguration.backgroundList) {
            if(options.hash.fromOrigin) {
            	if(LDoAConfiguration.backgroundList[key].origin === this.actor.system.origin) {
            		backgrounds[key] = LDoAConfiguration.backgroundList[key].name;
            	}
            } else {
                backgrounds[key] = LDoAConfiguration.backgroundList[key].name;
            }
        }        

        return(options.fn(context));
    });

    Handlebars.registerHelper("capitalize", function(text) {
        return(`${text.substring(0, 1).toUpperCase()}${text.substring(1)}`);
    });

    Handlebars.registerHelper("checkboxStateSelector", (setting) => {
        return(setting ? "checked" : "");
    });

    Handlebars.registerHelper("backgroundColourClassChooser", (value) => {
        return(value % 2 === 0 ? "ldoa-background-grey" : "ldoa-background-white");
    });

    Handlebars.registerHelper("originBackgroundSelect", (originId, originField, selectedKey) => {
        let origin   = getOrigins(originId).find((o) => stringToKey(o.name) === originId);
        let template = "<div>NO BACKGROUND OPTIONS AVAILABLE.</div>";

        if(origin) {
            let backgrounds = (origin.system ? origin.system.backgrounds : origin.backgrounds);
            let options     =  [`<option value=""></option>`];
            options = options.concat(getBackgrounds(originId).map((background) => {
                let selected = (background.key === selectedKey ? 'selected="selected"' : "");
                let suffix   = [game.i18n.localize(`ldoa.origins.${origin.id}.name`)];

                if(background.unique) {
                    suffix.push(game.i18n.localize("ldoa.fields.labels.unique"));
                }

                return(`<option ${selected}value="${background.key}">${game.i18n.localize(background.localeKeys.label)} (${suffix.join(', ')})</option>`);
            }));

            return(`<select class="ldoa-input ldoa-select ldoa-background-select" name="system.backgrounds.${originField}">${options.join("")}</select>`);
        } else {
            console.error(`Unable to locate an origin with the id '${originId}'.`);
        }

        return(template);
    });

    Handlebars.registerHelper("nonOriginBackgroundSelect", (originId, originField, selectedKey) => {
        let origins  = getOrigins();
        let template = "<div>NO BACKGROUND OPTIONS AVAILABLE.</div>";

        if(origins.length > 0) {
            let keys        = origins.map((o) => stringToKey(o.name));
            let backgrounds = getBackgrounds(...keys);
            let options     = ['<option value=""></option>'];

            backgrounds.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name)).map((background) => {
                let origin   = origins.find((o) => background.origin === o.id);
                let selected = (background.key === selectedKey ? 'selected="selected"' : '');
                let suffix   = [game.i18n.localize(`ldoa.origins.${origin.id}.name`)];

                if(background.unique) {
                    suffix.push(game.i18n.localize("ldoa.fields.labels.unique"));
                }
                options.push(`<option ${selected}value="${background.key}">${game.i18n.localize(background.localeKeys.label)} (${suffix.join(', ')})</option>`);
            });

            template = `<select class="ldoa-input ldoa-select" name="system.backgrounds.${originField}">${options.join("")}</select>`;
        } else {
            console.error(`Unable to locate an origin with the id '${originId}'.`);
        }

        return(template);
    });

    Handlebars.registerHelper("originSelect", (fieldName, selectedKey) => {
        let entries = getOrigins().map((origin) => {
            return({key: origin.key, id: origin.id, name: origin.name, selected: (stringToKey(origin.name) === selectedKey)});
        }).sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));
        let options = entries.map((entry) => {
            let selected = (entry.selected ? 'selected="selected"' : '');
            return(`<option ${selected} value="${stringToKey(entry.name)}">${game.i18n.localize(`ldoa.origins.${entry.id}.name`)}</option>`);
        });

        return(`<select class="ldoa-input ldoa-select" name="${fieldName}">${options.join("")}</select>`);
    });

    Handlebars.registerHelper("spellStateClass", function(state) {
        return(state === "unavailable" ? "ldoa-disabled" : "");
    });

    Handlebars.registerHelper("spellState", function(state) {
        return(game.i18n.localize(`ldoa.spells.states.${state}`));
    });

    Handlebars.registerHelper("selectAttributeOption", function(chosen) {
        let selected = (chosen === this.key ? " selected" : " ");
        return(`<option${selected} value="${this.key}">${game.i18n.localize(this.value)}</option>`);
    });

    Handlebars.registerHelper("selectGiftOption", function(chosen) {
        let selected = (chosen === this.key ? " selected" : " ");
        return(`<option${selected} value="${this.key}">${game.i18n.localize(this.name)}</option>`);
    });

    Handlebars.registerHelper("summoningState", function(state) {
        return(game.i18n.localize(`ldoa.summoning.states.${state}`));
    });

    Handlebars.registerHelper("tabLabelSelectionClass", function(name) {
        return(this.actor.system.tabSelected === name ? "ldoa-tab-selected" : "");
    });

    Handlebars.registerHelper("tabBodySelectionClass", function(name) {
        return(this.actor.system.tabSelected === name ? "": "ldoa-tab-hidden");
    });

    Handlebars.registerHelper("usageDie", function(die) {
        let text = (die.current !== "" && die.current !== "^" ? die.current : die.maximum);

        if(text === "exhausted") {
            text = game.i18n.localize("ldoa.dice.exhausted");
        }
        return(text);
    });

    Handlebars.registerHelper("weaponType", function(type) {
        if(type === "ranged") {
            return(game.i18n.localize("ldoa.weapons.types.ranged"));
        } else if(type === "unarmed") {
            return(game.i18n.localize("ldoa.weapons.types.unarmed"));
        } else {
            return(game.i18n.localize("ldoa.weapons.types.melee"));
        };
    });

    // Add hook functions.
    Hooks.on("renderChatMessage", (message, speaker) => {
        setTimeout(() => {
            let element = document.querySelector(`[data-message-id="${message.id}"]`);
            let node    = element.querySelector(".ldoa-roll-title");

            if(node) {
                node.addEventListener("click", toggleAttributeTestDisplay);
            }

            node = element.querySelector(".ldoa-damage-button");
            if(node) {
                node.addEventListener("click", logDamageRoll);
            }
        }, 250);
    });
});

Hooks.once("ready", function() {
    setTimeout(runMigrations, 500);
});
