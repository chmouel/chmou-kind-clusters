"use strict";

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;
const ByteArray = imports.byteArray;

var kindCommandsToLabels = {
  start: "Start",
  restart: "Restart",
  "delete cluster": "Stop",
};

var hasKind = !!GLib.find_program_in_path("kind");
var hasXTerminalEmulator = !!GLib.find_program_in_path("x-terminal-emulator");

/**
 * Check if Linux user is in 'docker' group (to manage Docker without 'sudo')
 * @return {Boolean} whether current Linux user is in 'docker' group or not
 */
var isUserInDockerGroup = (() => {
  const _userName = GLib.get_user_name();
  let _userGroups = ByteArray.toString(
    GLib.spawn_command_line_sync("groups " + _userName)[1]
  );
  let _inDockerGroup = false;
  if (_userGroups.match(/\sdocker[\s\n]/g)) _inDockerGroup = true; // Regex search for ' docker ' or ' docker' in Linux user's groups

  return _inDockerGroup;
})();

/**
 * Check if docker daemon is running
 * @return {Boolean} whether docker daemon is running or not
 */
var isDockerRunning = async () => {
  const cmdResult = await execCommand(["/bin/ps", "cax"]);  
  return cmdResult.search(/dockerd/) >= 0;
};

/**
 * Get an array of containers
 * @return {Array} The array of clusters as name
 */
var getClusters = async () => {
  const psOut = await execCommand(["kind", "get", "clusters"]);  

  const clusters = psOut.split('\n').filter((line) => line.trim().length).map((line) => {
    return line;
  });

  return clusters;
};

/**
 * Run a Docker command
 * @param {String} command The command to run
 * @param {Function} callback A callback that takes the status, command, and stdErr
 */
var runCommand = async (command) => {
  var cmd = hasXTerminalEmulator
    ? ["x-terminal-emulator", "-e", "sh", "-c"]
    : ["gnome-terminal", "--", "sh", "-c"];
  switch (command) {
    default:
      let shellcommand = `${cmd.join(" ")} "${command};read -t10 -p 'Press a key to exit....';"`;
      GLib.spawn_command_line_async(shellcommand);
      break;
  }
};

async function execCommand(
  argv,
  callback /*(status, command, err) */,
  cancellable = null
) {
  try {
    // There is also a reusable Gio.SubprocessLauncher class available
    let proc = new Gio.Subprocess({
      argv: argv,
      // There are also other types of flags for merging stdout/stderr,
      // redirecting to /dev/null or inheriting the parent's pipes
      flags: Gio.SubprocessFlags.STDOUT_PIPE,
    });

    // Classes that implement GInitable must be initialized before use, but
    // an alternative in this case is to use Gio.Subprocess.new(argv, flags)
    //
    // If the class implements GAsyncInitable then Class.new_async() could
    // also be used and awaited in a Promise.
    proc.init(null);

    return new Promise((resolve, reject) => {
      // communicate_utf8() returns a string, communicate() returns a
      // a GLib.Bytes and there are "headless" functions available as well
      proc.communicate_utf8_async(null, cancellable, (proc, res) => {
        let ok, stdout, stderr;

        try {
          [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
          callback && callback(ok, argv.join(" "), ok ? stdout : stderr);
          ok ? resolve(stdout) : reject(stderr);
        } catch (e) {
          reject(e);
        }
      });
    });
  } catch (e) {
    logError(e);
    throw e;
  }
}
