"use strict";

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const KindMenu = Me.imports.src.kindMenu;

// Triggered when extension has been initialized
function init() {}

// The kind indicator
let _indicator;

// Triggered when extension is enabled
function enable() {
  _indicator = new KindMenu.KindMenu(0.0, _("Kind CLusters"));
  Main.panel.addToStatusArea("kind-clusters-menu", _indicator);
}

// Triggered when extension is disabled
function disable() {
  _indicator.clearLoop();
  _indicator.destroy();
}
