# Olympe

Try it here 👉 [olym.pe](https://www.olym.pe)

## A natural language interface to query databases

- Multiple databases support
  - Postgres
  - BigQuery (wip)
- Support high number of tables
- Syntax support for entities ("Netflix" will match "net-flix")
- Use of database values and types to improve the query generation
- Plot results in a table or in a chart depending on the query/results
- Possibility to edit & correct the sql query
- Upload of CSV
- Support multiple profils and organisations

## Preview

<img width="800" alt="image" src="https://user-images.githubusercontent.com/2799516/213237779-d15619b0-d32e-41ef-a3b4-d2ad1499dfbf.png">

## Tech stack

- AI based on OpenAI's GPT-3 API
- Frontend: Vue3, Vite
- Backend: NestJS
- Database: Postgres
- Upload Service: sanic (python)

## Code structure

```
├── service: backend in nestjs
│   ├── src/databases
│   │   ├── implementatons (postgres, bigquery)
│   ├── src/files
│   ├── src/queries
│   ├── src/tables
│   ├── src/users
├── uploader: micro service to upload data to the playground
├── view: frontend in vue3
```

## Setup

### Back-end

in `/service`

- create a `.env` file with the following content:

```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgres://...
PROPELAUTH_URL=
PROPELAUTH_APIKEY=
PROPELAUTH_VERIFIER_KEY=
PROPELAUTH_ISSUER=
```

- `yarn` -- install dependencies
- `yarn typeorm migration:run` -- run migrations
- `yarn start:dev` -- run the backend

### Front-end

in `/view`

- create a `.env` file with the following content:

```
VITE_PROPELAUTH_URL=
```

- `yarn` -- install dependencies
- `yarn dev` -- run the front

## NL2SQL pipeline

1. getDatabaseSchema
2. selectTables (openai.select_tables.ejs)
3. extractConditionsValues (openai.where.ejs)
4. fetchClosedValues (from database)
5. getValidatedQueriesExamplesOnDatabase (openai.default.ejs)
