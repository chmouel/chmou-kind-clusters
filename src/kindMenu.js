"use strict";

const St = imports.gi.St;
const Gio = imports.gi.Gio; // For custom icons
const panelMenu = imports.ui.panelMenu;
const { arrowIcon, PopupMenuItem } = imports.ui.popupMenu;
const extensionUtils = imports.misc.extensionUtils;
const Me = extensionUtils.getCurrentExtension();
const Kind = Me.imports.src.kind;
const GObject = imports.gi.GObject;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;


// Kind icon as panel menu
var KindMenu = GObject.registerClass(
  class KindMenu extends panelMenu.Button {
    _containers = [];
    _init(menuAlignment, nameText) {
      super._init(menuAlignment, nameText);
      this._refreshCount = this._refreshCount.bind(this);
      // Custom Kind icon as menu button
      const hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      const gicon = Gio.icon_new_for_string(
        Me.path + "/icons/kind.svg"
      );
      this.Icon = new St.Icon({
        gicon: gicon,
        style_class: "system-status-icon",
        icon_size: "16",
      });
      const loading = "";
      this.buttonText = new St.Label({
        text: loading,
        style: "margin-top:4px;",
      });

      hbox.add_child(this.Icon);
      hbox.add_child(this.buttonText);
      this.add_child(hbox);
      this.connect("button_press_event", this._refreshMenu.bind(this));
      this.menu.addMenuItem(new PopupMenuItem(loading));

      this._refreshCount();
      if (Kind.hasKind) {
        this.show();
      }
    }

    // Refresh  the menu everytime the user click on it
    // It allows to have up-to-date information on kind clusters
    _refreshMenu() { 
      if (this.menu.isOpen) {        
        this.menu.removeAll();
        this._feedMenu().catch( (e) => this.menu.addMenuItem(new PopupMenuItem(e.message)));
      }     
    }

    _checkServices() {
      if (!Kind.hasKind) {
        let errMsg = _(
          "Please install Kind to use this plugin"
        );
        this.menu.addMenuItem(new PopupMenuItem(errMsg));
        throw new Error(errMsg);
      }
    }

    async _checkDockerRunning() {
      if (!(await Kind.isDockerRunning())) {
        let errMsg = _(
          "Please start your Docker service first!\n(Seems Docker daemon not started yet.)"
        );
        throw new Error(errMsg);
      }
    }

    async _checkUserInDockerGroup() {
      if (!(await Kind.isUserInDockerGroup)) {
        let errMsg = _(
          "Please put your Linux user into `docker` group first!\n(Seems not in that yet.)"
        );
        throw new Error(errMsg);
      }
    }

    async _check() {
      return Promise.all(
        [
          this._checkServices(),
          this._checkDockerRunning(),
          this._checkUserInDockerGroup()
        ]
      );
    }
    
    clearLoop() {
      if (this._timeout) {
        Mainloop.source_remove(this._timeout);
        this._timeout = null;
      }
    }

    async _refreshCount() {
      try {
        this.clearLoop();
        this.clusters = await Kind.getClusters();
        if (this.clusters.length > 0) {            
          this.Icon.set_gicon(Gio.icon_new_for_string(
            Me.path + "/icons/kind.svg"
          ));  
        } else {
          this.Icon.set_gicon(Gio.icon_new_for_string(
            Me.path + "/icons/kind-stop.png"
          ));
        }

        this._timeout = Mainloop.timeout_add_seconds(
          380,
          this._refreshCount
        );
      } catch (err) {
        logError(err);
      }
    }
    // Append containers to menu
    async _feedMenu() {    
      await this._check(); 
      if (this.clusters.length > 0) {
      
        let stopit = new PopupMenuItem(_("Stop"));
        stopit.actor.connect('button-press-event', function(){ 
          Kind.runCommand("/home/chmouel/GIT/perso/config/hosts/pignon/bin/stopkind");
          this._refreshMenu();
        });
        this.menu.addMenuItem(stopit);
      } else {
        let stopit = new PopupMenuItem(_("Start"));
        stopit.actor.connect('button-press-event', function(){ 
          Kind.runCommand("/home/chmouel/GIT/perso/config/hosts/pignon/bin/startkind");
        });
        this.menu.addMenuItem(stopit);
      }    
    }
  }
);
