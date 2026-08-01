# Risk exploration signal origins

The `부처 신호` and `고객 신호` filters represent intake origins, not a second way of labeling public evidence.

- `department-intake`: a signal received through the department/field intake route.
- `customer-intake`: an anonymized signal received through the customer route.
- `public-evidence`: an official article, law, statistic, or report used to corroborate a candidate.

`RiskExplorationRecord.signalOrigin` stores this distinction. A `sourceUrl`, quote, or evidence ID is supporting evidence and does not mean that the public document was the intake itself. The department/customer filters therefore use `signalOrigin`; individual, corporate, and legal filters continue to use the risk categories.

Customer input remains a review signal. A single customer submission is not automatically promoted to a finalized risk candidate; aggregation, de-identification, and human review are required before operational promotion.
