# forge

A Node.js tool for continuous integration and development.

## What does it do?

At the time of this writing, forge will manage the running of a Node.js project while watching a RabbitMQ endpoint for changes to your project repository. When your RabbitMQ server receives a push notification from Github, forge will trigger an update of the local project repository and then restart your process.

The primary use case right now is for development/staging environments where projects need to be kept running and in sync with the latest git revision.

## Installation

```bash
    $ [sudo] npm install forge.js -g
```

## Basic Usage

```bash
    $ forge [options] run [options] SCRIPT [script options]
```

## Configuration

Application level configuration options can be specified in a `forge.json` file located in the project root. An example configuration file might look like this:

```
{
    "rabbitmq": {
        "connection": {
            "host": "rabbit.somedomain.com",
            "login": "rabbituser",
            "password": "rabbitpass",
            "vhost": "rabbitvhost"
        },
        "queue": "rabbit.queue",
        "exchange": "rabbit.exchange",
        "key": "github.push.author.repository.master"
    },
    "scripts": {
        "update": "./update.js && echo \"This was a shell command\""
    }
}
```

## Run Test Suite

```bash
    $ npm test
```

### This is alpha software. Use at your own risk.

**Dual licensed under MIT and GPL**