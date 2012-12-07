# forge

A Node.js tool for continuous integration and development.

## What does it do?

forge manages node processes and keeps them running in the background or foreground. It is also capable of live updating a project and restarting the process by listening to an AMQP endpoint or setting up an HTTP listener for post commit hook notifications coming from Github. When a notification is received, forge will attempt a safe update by pulling the latest code via git and running any update scripts specified in the configuration. If errors are encountered at any point in this process, forge will attempt to rollback to the previous revision.

#### Servers

Let forge manage long running processes in on your development/staging environments for projects that need to be kept up to date. It uses the awesome [forever-monitor](https://github.com/nodejitsu/forever-monitor) module from [nodejitsu](http://nodejitsu.com) internally to manage and monitor processes.

#### Developers

Start forge up in "watch" mode and let it handle running and restarting your node app while you're working. You can also use the update feature directly to make sure that your repo is current and any necessary setup scripts have run.

## Installation

```bash
    $ [sudo] npm install forge.js -g
```

## Basic Usage

```bash
    $ forge [options] run [options] SCRIPT [script options]
```

To run a script in the foreground:

```bash
    $ forge run myscript.js
```

To pass arguments to the script itself, encase it in quotes

```bash
    $ forge run "myscript.js arg1 arg2"
```

In "watch" mode, forge will detect changes to your project and restart your script automatically. To use watch mode:

```bash
    $ forge run --watch myscript.js
```
*Be sure to add files/directories to exclude in your configuration file. (See sample config below)*


To run in the background:

```bash
    $ forge run --daemon myscript.js
```

To stop background script:

```bash
    $ forge stop myscript.js
```

To run just the update process:
```bash
    $ forge update
```

## Configuration

Application level configuration options can be specified in a `forge.json` file located in the project root. An example configuration file might look like this:

```javascript
{
    // The file to execute if none is specified
    "executable": "app.js",

    // Run update process prior to starting program
    "update_on_start": false,

    // The maximum number of times the script should attempt to be restarted in case of crashes
    "max_restarts": null,

    // Information for update listener connections
    "connections": {
        // Turn update connection on by default
        "on": true,

        // Determines which connector to use if "rabbitmq" and "http" configurations are both present
        "use": "rabbitmq",

        // RabbitMQ connection info
        // To use, set up an amqp post commit hook in Github
        "rabbitmq": {
            "connection": {
                "host": "rabbit.somedomain.net",
                "login": "rabbituser",
                "password": "rabbitpass",
                "vhost": "rabbitvhost"
            },
            "queue": "rabbitmq.queue",
            "exchange": "rabbitmq.exchange",
            "key": "github.push.owner.repo.revision"
        },
        // Information to set up HTTP server to listen for update
        // To use, point a post commit hook at http://yourhost.com:{{ http.port }}
        "http": {
            "port": 9999,
            "key": "owner.repo.revision"
        }
    },
    "scripts": {
        // This command will be run after an update is performed
        "update": "npm install && ./update.js && echo \"This was a shell command\""
    },
    // Parameters for watch mode
    "watch": {

        // Turn watch mode on by default
        "on": false,

        // Path relative to the project directory that should be watched for changes
        // Defaults to project root
        "path": "",

        // A list of files and directories to exclude from watching
        // All values will be relative to watch.path
        "exclude": [],
    },
    // Parameters for daemon mode
    "daemon": {

        // Start daemon mode by default
        "on": false,

        // Directory in which to store pid files
        // @TODO: Implement "forge" folder inside this directory for pid storage
        "pid_dir": "/tmp",

        // Log file for stdout
        "stdout_log": "./out.log",

        // Log file for stderr
        "stderr_log": "./out.log"    
    },
    // Git repo information
    "git": {
        "remote": "origin",
        "revision": "master"
    }
}
```

## Run Test Suite

```bash
    $ npm test
```

### This is beta software. Use at your own risk. It has been developed and tested only on OS X thus far.

**Dual licensed under MIT and GPL**