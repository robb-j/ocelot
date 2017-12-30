# Ocelot Docs

Generate Api documentation using YAML

```yaml
---
version: 0.4.2
groups:
  - wizards
---

wizards:
  name: Endpoints to manage those pesky wizards
  endpoints:
  - id: list
    method: get
    url: /wizards
    info: Finds as many wizards, sorted by hat size
    
  - id: create
    method: post
    url: /wizard
    info: Gives birth to a new wizard with the passed parameters
    body:
      name: string - What to call the wizard
      hatSize?: number - How big to make his hat
```

Docs are rendered to index.html in your output directory, or `docs` by default. If there are compilation errors they are rendered instead.

## Using the CLI

```bash

# Install globally
npm i -g ocelot-docs

# Get help
ocedocs --help

# Install locally for dev
npm i -D ocelot-docs

# Run locally (i.e. from package.json scripts)
node_modules/.bin/ocedocs --input api --output docs

# Watch the docs (creates an express server)
node_modules/.bin/ocedocs -w

```

## Writing Docs

Docs should be in their own directory, it defaults to `/api` but you can change it with `--input myDir`. Ocelot expects this folder to have an `info.yml` which contains information about your api. Namely it can have the `name`, `template` and `description` of your api. The `template` is optional and refers to an npm package defining the api template.

### info.yml

``` yaml
name: Wizards Api
template: my-custom-npm-template
description: >
  A simple API for creating & managing pesky wizards
```

### Defining Endpoint Versions

After defining that, Ocelot will look for any directories inside your input folder which contain an `endpoints.yml`.

#### endpoints.yml

An endpoints file should contain 2 YAML documents, the first contains the version block defining information about this version of the API. The second contains the group definition which is the groups of endpoints.

``` yaml
---
version: 0.0.1
base: /
groups:
  - wizards
---
wizards:
  base: /wzrd
  name: Wizards
  endpoints:
  - id: index
    method: get
    url: /list
    name: Fetch Wizards
    info: Looks for all wizards and sorts them by hat size
---
```

#### The Version Block

| Field      | Info |
| ---------- | ---- |
| `version`  | The version number |
| `base`     | **optional** – A base url that all endpoints will be added on to |
| `groups`   | The groups of endpoints in this version, a array of strings |

#### The Groups Block

The groups block should be an object containing definitions for each of the groups defined in `version.groups`.

#### Group Definition

| Field       | Info |
| ----------- | ---- |
| `base`      | **optional** – A base url for this group |
| `name`      | The name of the group |
| `endpoints` | The list of ***endpoint*** definitions |

#### Endpoint Definition

| Field       | Info |
| ----------- | ---- |
| `id`        | An identifier for the endpoint |
| `method`    | The http method the endpoint uses |
| `url`       | The url where the endpoint is, joined onto the group and version's `base` |
| `name`      | The name of the endpoint |
| `info`      | **optional** – A longer description of the endpoint |
| `responses` | **optional** – A list of ***response*** definitions |
| `params`    | **optional** – The url parameters e.g. `/find/:id`, an ***argument*** definition |
| `query`     | **optional** – The query parameters e.g. `?key=val`, an ***argument*** definition |
| `body`      | **optional** – The json body parameters, an ***argument*** definition |

#### Argument Definition

An argument definition is a YAML object with definitions for a set of arguments. They key is the name of the arg and the value is a string definition containing the type, a dash `-` and the descriptions. If the key ends with a `?`, it marks it as optional.

``` yml
name: string - The name of the wizard
age?: number - An optional age of the wizard
```

#### Response Definition

``` yml
- name: Success
  status: 200
  body: index/success.json
- name: Not Found
  status: 404
  body: index/notFound.json
```

A response definition is an array of objects which describes potential responses that the endpoint can return. `status` is the http status code that the response comes with. `body` is a reference to a file which contains an example response body.

To look for the body it will look look in `data/` inside the version directory, joining the path onto that.


## Custom templates

A template is an npm package used to render an api definition using pug. The package should have a `template/` directory which should contain:

* `info.yml` – A file containing info about the template
* `index.pug` – A pug template to render the api definition
* `error.pug` – A pug template to render errors or warnings

### info.yml

``` yaml
name: Custom Template
version: 0.1.2
link: https://example.com
webpack: webpack.config.js

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
| `webpack` | **optional** – An optional webpack config file (inside `template`) used when watching the docs, using `-w` |
| `assets`  | **optional** – A list of directories that will be copied into the compiled result |

For more info, see the [default template](https://github.com/robb-j/ocelot-template).
