# Ocelot Docs

Generate Api documentation using yaml

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
      hatSize: number? - How big to make his hat
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

> Detailed Docs Coming soon<sup>tm</sup>
