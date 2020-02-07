# jrni-cli

## Installation

Requires node 10. See [Downloading and installing Nodejs and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

```npm install -g @jrni/jrni-cli```

If you see permission errors when trying to install see [Resolving EACCES permissions errors when installing packages globally](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

## Options

Options may be passed with flags, however you will be prompted to enter any missing required
options.

The options will be stored in the project directory in ```.bbugrc```. This avoids the need to
re-enter options upon re-triggering commands for a given app project.

## Commands

### Install

Builds and installs an app package to the BookingBug engine. Run the command in the Jext app project
directory.

```jrni-cli install [options]```

Options:

<table>
  <tr>
    <td>--email</td><td>Email address used to log into JRNI</td>
  </tr>
  <tr>
    <td>--password</td><td>Password used to log into JRNI</td>
  </tr>
  <tr>
    <td>--host</td><td>Destination host server</td>
  </tr>
  <tr>
    <td>--companyId</td><td>Destination company</td>
  </tr>
  <tr>
    <td>--port</td><td>HTTP port to use</td>
</table>

### Uninstall

Removes an app package from the BookingBug engine.

```jrni-cli uninstall [options]```

Options:

<table>
  <tr>
    <td>--email</td><td>Email address used to log into JRNI</td>
  </tr>
  <tr>
    <td>--password</td><td>Password used to log into JRNI</td>
  </tr>
  <tr>
    <td>--host</td><td>Destination host server</td>
  </tr>
  <tr>
    <td>--companyId</td><td>Destination company</td>
  </tr>
  <tr>
    <td>--port</td><td>HTTP port to use</td>
</table>

### Tail

Display the script logs for an app package.

```jrni-cli tail [options]```

Options:

<table>
  <tr>
    <td>--email</td><td>Email address used to log into JRNI</td>
  </tr>
  <tr>
    <td>--password</td><td>Password used to log into JRNI</td>
  </tr>
  <tr>
    <td>--host</td><td>Destination host server</td>
  </tr>
  <tr>
    <td>--companyId</td><td>Destination company</td>
  </tr>
  <tr>
    <td>--port</td><td>HTTP port to use</td>
</table>

