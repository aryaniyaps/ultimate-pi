# Planning Review Gate rubrics (spawn fragment)

Parent includes this file in debate agent spawn text. Stable check ids by `debate_round_focus`.

## spec

- SC-01: Every acceptance_check maps to scope or execution_plan work_item
- SC-02: Out-of-scope work is listed in decomposition `excluded`
- SC-03: Hypothesis brief falsifiability and success metrics are testable
- SC-04: Risk register covers top technical unknowns

## wbs

- WB-01: Each work_item has typed `done_criteria` (not vague “implement X”)
- WB-02: No orphan work_items (every item on critical path or sprint_contract)
- WB-03: `depends_on` is acyclic; parallel_safe only when files disjoint
- WB-04: wbs_dictionary entry per non-trivial work_item

## schedule

- SH-01: `schedule_metadata.critical_path_work_item_ids` is non-empty for med/high risk
- SH-02: Phase entry/exit criteria are observable
- SH-03: Milestones align with acceptance_checks dates where stated
- SH-04: No impossible parallelism (same file, conflicting owners)

## quality

- QL-01: sprint_contract.done_criteria_types complete (ADR-020)
- QL-02: Verify/lint/test work_items in early phases when risk ≥ med
- QL-03: Checkpoint gaps between phases documented
- QL-04: Keep Quality Left — no “test at end only” without justification
