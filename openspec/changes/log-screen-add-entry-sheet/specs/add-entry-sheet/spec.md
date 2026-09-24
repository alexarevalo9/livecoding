# Delta for add-entry-sheet

## ADDED Requirements

### Requirement: Sheet presentation

Tapping the FAB MUST open the Add Entry form as a sheet over the Log screen. Dismissing it without saving MUST NOT change the list.

#### Scenario: Open and cancel
- GIVEN the Log screen
- WHEN the user taps the FAB, then dismisses the sheet
- THEN the list is unchanged

### Requirement: Form fields and validation

The form MUST have date, sleep time, wake time (all required) and notes (optional). Save MUST be blocked with visible feedback when a required field is empty or sleep time equals wake time. Wake earlier than sleep MUST be accepted as overnight. Future dates and duplicate entries MUST be accepted.

#### Scenario: Missing field
- GIVEN wake time is empty
- WHEN the user taps save
- THEN an error is shown, the sheet stays open, and no entry is added

#### Scenario: Equal times
- GIVEN sleep 21:00 and wake 21:00
- WHEN the user taps save
- THEN an error is shown and no entry is added

#### Scenario: Overnight, future date
- GIVEN a future date, sleep 22:00, wake 06:00
- WHEN the user taps save
- THEN the entry is saved with an 8h duration

### Requirement: Save

A valid save MUST create one entry (one per sleep stretch, dated with the sleep-start date), dismiss the sheet, and show the entry at the top of the list as the highlighted latest.

#### Scenario: Valid save
- GIVEN valid inputs and optional notes
- WHEN the user taps save
- THEN the sheet closes and the new entry is first and highlighted with correct duration
