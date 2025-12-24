# Scripts - Discord command settings

To manage Discord command settings.

## Preparation

Make `config.json` file. (cf. [config.samlple.json](config.samlple.json))

## Run

```shell
$ node index.js list
$ node index.js add <command_name>
$ node index.js remove <command_id>
```

If `-g`/`--global` option is specified, you can manage global commands.
(If not, specific guild commands are managed.)
