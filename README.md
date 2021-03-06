# Ocelot Docs

Generate Api documentation using YAML

```yaml
version: 0.4.2
---
wizards:
  name: Management
  endpoints:
  - get: /wizards listWizards
    info: Finds all of the wizards that are available, sorted by hat size
    
  - post: /wizard createWizard
    info: Gives birth to a new wizard setting their name & (optionally) hat size
    body:
      name: string - What to call the wizard
      hatSize?: number - How big to make his hat
    responses:
    - 200: Success created.json
```

Docs are rendered to `index.html` & `spec.json` in your output directory, which is `docs` by default. If there are compilation errors they are rendered instead.

![Example Docs](assets/screenshot.png)

## Contents

- Examples
  - [Simple](examples/specs/simple)
  - [Multi Version](examples/specs/versions)
  - [Full](examples/specs/full)
- [Using the CLI](#using-the-cli)
- [Writing Docs](#writing-docs)
  - [Api Info](#api-info)
  - [Endpoint Versions](#endpoint-versions)
    - [Group Definition](#group-definition)
    - [Endpoint Definition](#endpoint-definition)
    - [Argument Definition](#argument-definition)
    - [Response Definition](#response-definition)
  - [Version Info](#version-info)
- [Custom Templates](#custom-templates)

## Using the CLI

```bash

# Install for your project
npm install --save-dev ocelot-docs

# Run inside your project
npx ocedocs --help

# Generate documentation
npx ocedocs --input apispec --output apidocs

# Watch the docs (regenerates the docs on page load)
npx ocedocs -w

```

## Writing Docs

You write you doc specification in its own directory, which defaults to `api/`. There should be an `info.yml` in that directory which describes your api, it can have a `name`, `description` and `template`. The `template` refers to an npm package defining the api template, see [Custom Templates](#custom-templates).

### Api Info

**info.yml**

```yaml
name: Wizards Api
# template: my-custom-npm-template
description: >
  A simple API for creating & managing those pesky wizards
```

### Endpoint Versions

Ocelot expects each version of your api to be in its own directory inside your input directory, e.g. `v1/` or `1.0.0/`, but you can have a single version at the root if you want. Ocelot sees any directory with an `endpoints.yml` file in as an api version.

**endpoints.yml**

```yaml
wizards:
  base: /wzrd
  name: Wizards
  endpoints:
  - id: index
    method: get
    url: /list
    name: Fetch Wizards
    info: Looks for all wizards and sorts them by hat size
  - post: /new create
    name: Create Wizard
    body:
      name: string - The name of the wizard
```

Above is an example of an endpoints file, at the top level you have your [groups](#group-definition) which are a set of [endpoint](#endpoint-definition) definitions.

#### Group Definition

| Field       | Info |
| ----------- | ---- |
| `name`      | The name of the group |
| `base`      | **optional** – A base url for this group, relative to the version's base |
| `endpoints` | The list of ***endpoint definitions***  |

#### Endpoint Definition

An endpoint is a specific url & http method that performs some logic in your api and returns a response.

| Field       | Info |
| ----------- | ---- |
| `id`        | An identifier for the endpoint |
| `method`    | The http method to access the endpoint |
| `url`       | The url to access the endpoint, relative to the group |
| `name`      | The name of the endpoint |
| `info`      | **optional** – A longer description of the endpoint |
| `responses` | **optional** – A list of [Response Definition](#response-definition) |
| `params`    | **optional** – The url parameters e.g. `/find/:id`, an [Argument Definition](#argument-definition) |
| `query`     | **optional** – The query parameters e.g. `?key=val`, an [Argument Definition](#argument-definition) |
| `body`      | **optional** – The json/form body parameters, an [Argument Definition](#argument-definition) |

##### Endpoint Shorthand

As seen at the very top, you can use the endpoint shorthand which defines the `method`, `url` & `id` in one go. The equivalent of the previous example would be:

```yaml
endpoints:
  - get: /list index
    name: Fetch Wizards
    info: Looks for all wizards and sorts them by hat size
```

#### Argument Definition

An argument definition is a YAML object with descriptions for a set of arguments. They key is the name of the argument and the value is a string definition containing the type, a dash (`-`) and the description. If the key ends with a `?`, it is marked as optional.

```yaml
name: string - The name of the wizard
age?: number - An optional age of the wizard
```

#### Response Definition

```yaml
- 200: Success index/success.json
- 404: Not Found index/failed.json
```

A response definition is an array of objects which describe potential responses that the endpoint can return. It is in three parts, the key is the http `status` code, the first part is the human-friendly `name` and the last is the `body`, a reference to a file with an example json response in.

* `name` is a friendly name of this response
* `status` is the http status code this response comes with
* `body` is a reference to a file which contains the example body (a json file)

To look for the body it will look look in `data/` directory relative to your `endpoints.yml` file.

## Version Info

When writing an `endpoints.yml` file, you can optionally define a version block at the top which defines meta information about this version of your api.

```yaml
version: 0.0.1
base: /
groups:
  - wizards
  - witches
  - misc
---
wizards:
  # An endpoint group ...
```

### Version Block

| Field      | Info |
| ---------- | ---- |
| `version`  | The name of this version |
| `base`     | **optional** – The base url for this version, all endpoints will be under this |
| `groups`   | **optional** - The order of the endpoint groups in this version, an array of strings |

## Custom templates

A template is an npm package used to render an api definition using [pug](https://pugjs.org/). The package should have a `template/` directory which should contain:

* `info.yml` – A file containing info about the template
* `index.pug` – A pug template to render the api definition
* `error.pug` – A pug template to render errors or warnings

**info.yml**

```yaml
name: Custom Template
version: 0.1.2
link: https://example.com

assets:
- js
- css
- img
```

| Field     | Info |
| --------- | ---- |
| `name`    | The name of the template |
| `version` | The version of the template |
| `link`    | A link to the template's author |
| `assets`  | **optional** – A list of directories that will be copied into the compiled result |

For more info, see the [default template](https://github.com/robb-j/ocelot-template). There is also the `spec.json`, which is created along side your `index.html`, which is used to render the docs.
