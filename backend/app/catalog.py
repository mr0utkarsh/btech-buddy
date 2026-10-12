"""Allowed academic catalog for the customer deployment.

BTech Buddy is purpose-built for a single program:

    University:      Shri Mata Vaishno Devi University (SMVDU), Katra
    Branch:          CSE (Computer Science and Engineering)
    Specialization:  AI and Robotics  (ONE combined option — never split)

These constants are the single source of truth used by the public read
endpoints, the admin validation, and the stats endpoints so that no API can
return or accept an institution/branch/specialization outside this set.
Matching is done against the *stable* short_name / code so it keeps working
regardless of the underlying uuid.
"""
from __future__ import annotations

ALLOWED_UNIVERSITY_SHORT_NAME = "SMVDU"
ALLOWED_UNIVERSITY_NAME = "Shri Mata Vaishno Devi University"

ALLOWED_BRANCH_CODE = "CSE"
ALLOWED_BRANCH_NAME = "Computer Science and Engineering"

# "AI and Robotics" is a single combined specialization.
ALLOWED_SPECIALIZATION_NAME = "AI and Robotics"
ALLOWED_SPECIALIZATIONS = [ALLOWED_SPECIALIZATION_NAME]
