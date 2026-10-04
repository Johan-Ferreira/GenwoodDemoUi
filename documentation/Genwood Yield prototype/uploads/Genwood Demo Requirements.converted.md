# High Level Requirements (AI)

**Genwood CTO Demo: BoE Yield Curve Data Solution**

**Objective**

Build an end-to-end working solution demonstrating how Digiata would ingest, govern, expose and consume financial market data within an enterprise-grade architecture.

**This must not be a smoke-and-mirrors demo.** The solution should be sufficiently real that we can move from the UI into the underlying implementation and confidently show the CTO the **architecture, workflow, APIs, code, automated tests, audit trail, error handling and documentation**.

The source dataset will be the Bank of England Yield Curves, which provides daily estimated UK yield curves, including government bond nominal/real curves, implied inflation and SONIA/OIS-based nominal curves. [[bankofengland.co.uk]](https://www.bankofengland.co.uk/statistics/yield-curves), [[bankofengland.co.uk]](https://www.bankofengland.co.uk/statistics/yield-curves/terminology-and-concepts)

**1. Data ingestion**

Import the latest BoE yield-curve dataset from the published data source:

[Bank of England yield curves](https://www.bankofengland.co.uk/statistics/yield-curves)

For the demo, **do not spend effort demonstrating the transport mechanism**. Assume that the input file arrives through email or SFTP and starts the workflow from there.

The implementation should:

* ingest and parse the source data;
* validate the file/data before processing;
* transform it into a sensible, structured data model;
* persist the processed data;
* handle malformed, incomplete or unexpected input cleanly;
* provide clear processing status and errors.

The developers should understand the financial data rather than treating it simply as columns in a file. In particular, understand **spot rates, forward rates, nominal rates, real rates and implied inflation**. The BoE specifically defines a nominal spot rate as the rate used to discount an individual future nominal cash flow to its present value, which makes this particularly relevant to the optional PV/FV use case below. [[bankofengland.co.uk]](https://www.bankofengland.co.uk/statistics/yield-curves/terminology-and-concepts)

**2. Digiata engineering standards: non-negotiable**

The demo must visibly demonstrate the following:

**Audit & tracking**

* Trace a data load from receipt through validation, transformation and publication.
* Show when it ran, its status and what happened.
* Demonstrate traceability of failures/errors.
* Where sensible, allow us to trace published data back to its source/import.

**Workflow engine**

* Orchestrate the ingestion and processing through the Digiata workflow approach.
* Show the workflow rather than hiding the orchestration in application code.
* Demonstrate a successful path and at least one controlled error/failure path.

**API standards**

* Expose the processed yield-curve data through a **Linx API**.
* API structure, naming, versioning, validation and error responses must follow Digiata standards.
* Make the API easy for a downstream technical consumer to understand and use.

**Automated testing**

* Include automated tests across the important components.
* Demonstrate that tests execute rather than simply showing test artefacts.
* Include both happy-path and failure/validation scenarios.

**Documentation**

* Solution/architecture overview.
* Data model and transformation assumptions.
* API documentation and example requests/responses.
* Developer-level documentation sufficient for another engineer to understand the solution.

**3. Web UI**

Provide a clean web interface showing the structured BoE data.

Keep this purposefully simple. The UI exists to make the data and processing visible, **not to become the centrepiece of the demo**.

At minimum, show:

* available curve/dataset;
* effective/data date;
* maturity/tenor;
* relevant rates;
* import/processing status where appropriate.

A simple yield-curve visualisation would add value if straightforward.

**4. Downstream API consumption**

Demonstrate the same structured data being exposed through the **Linx API**.

The key scenario is:

An actuary/data scientist should be able to retrieve the governed yield-curve data programmatically and use it in their own model.

Show how a lightweight **Python consumer** calling the API and retrieving the data would be built and used by actuarial team (we don’t need to build the Python consumer, we can show the API works on **Postman and Swagger**. This is important because it demonstrates that the UI is only one consumer and that the underlying solution is reusable and integration-ready.

**5. Nice to have: actuarial PV/FV example**

**Owner/input required: Ronald**

Consult Ronald on the most credible way to demonstrate this before implementing it.

Using mock actuarial/pension data, potentially including:

* projected cash flows/contributions;
* time periods;
* mortality assumptions/rates;
* appropriate BoE curve/rates,

show how the imported yield-curve data can feed a simple **Present Value / Future Value calculation**.

The BoE documentation explicitly identifies spot rates as rates used to discount future cash flows to present value, making this a natural business demonstration of the dataset. [[bankofengland.co.uk]](https://www.bankofengland.co.uk/statistics/yield-curves/terminology-and-concepts)

The purpose is **not to build an actuarial engine**. It is to demonstrate the journey:

**BoE source → ingestion → validation → governed data → API → actuarial consumption → calculated business value**

**Demo expectation**

By the end of the demo we should be able to say:

**“You have seen the business outcome. Now let us open the bonnet.”**

From there, the team must be comfortable moving into the **workflow, Linx implementation/API, source code, data model, audit trail, exception handling, automated tests and documentation**.

**Success criterion:** if the CTO asks*“show me how that actually works”* at any point in the demo, we should be able to show him.

**Potentially have Gawie/ Anton in the demo to field product related questions.**

# Demo Requirement Call Notes:

[Genwood demo brief](https://digiatats-my.sharepoint.com/%3Afl%3A/g/personal/johan_ferreira_digiata_com/IQDWu0nmih6vTIc98C6rzE9QAdXIEshtp2VOQOHn8l5_JOs?nav=cz0lMkZwZXJzb25hbCUyRmpvaGFuX2ZlcnJlaXJhX2RpZ2lhdGFfY29tJmQ9YiFSZFQ2cDhXNXkwNktLNU9TbGZ1dkFfMm9qcDFzelE1SG9KRnBYamhTOTJMdFVQQmVCZnRWU3JfSDhOaWkzNXFLJmY9MDFPTks3REhXV1hORTZOQ1E2VjVHSU9QUFFGMlY0WVQyUSZjPSUyRiZmbHVpZD0xJmE9VGVhbXMmcD0lNDBmbHVpZHglMkZsb29wLXBhZ2UtY29udGFpbmVy)

**Decisions**

* Nemanja and Johan prioritise a realistic standards-based proof of concept.
* Nemanja and Johan demonstrate the complete validated ingestion workflow.
* Nemanja and Johan expose a demo API without production authorisation.

**Open questions**

* Confirming the Wednesday/Thursday demonstration date pending stakeholder availability.
* Defining the actuarial modelling scope after core ingestion is complete.

**Meeting notes**

**Jenwood Demo**

* Nemanja began briefing Johan on the Jenwood demo and said the organisation had incorporated in May and had not launched yet
* Nemanja described a preference for demonstrating a concrete business problem rather than presenting a generic demo, so that the user could see how the solution would work in practice
* Nemanja said the demo could use shortcuts, but the team needed to make clear which parts were simplified and which standards and principles underpinned the solution

**Pension-Fund Ecosystem**

* Nemanja described the organisation's pension-fund ecosystem as including a third-party administrator for member-facing portals and records, an asset manager for investments, and internal actuarial and ledger systems

**Technology Strategy**

* Nemanja said the new CTO wanted to build rather than buy workflow capabilities and was considering products including Comundo and Monday.com

**Integration Architecture**

* Nemanja said the CTO wanted standardised APIs and data schemas across specialist systems, with an integration hub that would support replacing systems over time
* Nemanja said the API hub patterns would need to fit how the organisation developed its systems, with links potentially becoming code as the solution moved towards a closed implementation
* Nemanja said the data transport could be demonstrated through website file pickup or upload, while email or SFTP were possible alternatives that they did not want to spend time setting up
* Nemanja said the demo could expose APIs between the back end and front end if doing so did not take too long; otherwise, the team could demonstrate how APIs would be made available in a formal implementation
* Nemanja clarified that the team would provide an API for the organisation's site and API to consume the data; formal authorisation would not be needed for the demo

**Data Modelling**

* Nemanja said a potential use case involved importing Bank of England data on yield fields into a database, with possible modelling of present and future value and consideration of mortality rates for planning
* Nemanja described the data flow as importing or uploading a file, ingesting and validating it, and persisting the data in a database; they also identified Ronald as a potential source of guidance on which data fields would demonstrate value
* Nemanja described a possible calculation using projected cash flows, member contributions, mortality assumptions, and curve rates, with the results potentially shown through a front-end visualisation

**Workflow Automation**

* Nemanja discussed showing the workflow for automating the data process, including data intake, validation, and handling exceptions
* Nemanja discussed using AI to generate documents and test cases, including test cases linked directly to APIs
* Nemanja said the demo requirements included showing data imports, automated ingestion, end-to-end lifecycle tracking, and a web UI displaying the process and its status
* Nemanja said the demo should prioritise ingesting and checking the data, then showing the workflow steps for the real process of downloading data, sending it to actuaries, receiving it back, and automating the process

**Demo Scope**

* Nemanja said the calculation and visualisation were a nice-to-have, while getting the data into the system and demonstrating the wider process were higher priorities
* Johan said the demo was specific to the current opportunity rather than fully covered by the Digiata app standards, although he understood the relevant standards

**Demo Presentation**

* Nemanja said they wanted to show the demo to Diederick in person while Diederick was in the UK until Thursday
* Nemanja said the demo date still needed confirmation from Diederick, with Wednesday or Thursday considered workable rather than Monday or Tuesday
* Nemanja said the audit trail should be shown visually, including workflow monitoring and the back-end process workflow, with links opened during the demo where needed

**Technical Ownership**

* Nemanja said Anton would handle the technical aspects involving the tools and agents

**Approval Readiness**

* Johan reported that the augment risk material was nearly ready to send for approval and remained the biggest potential distraction; he also said a high-rise upload was expected, after which he could focus more on the demo