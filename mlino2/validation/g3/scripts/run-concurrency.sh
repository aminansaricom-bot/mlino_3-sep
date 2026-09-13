#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 -U postgres -d g3_history \
  -f /tmp/concurrency-session-a.sql >/tmp/concurrency-a.log 2>&1 &
session_a=$!

set +e
psql -v ON_ERROR_STOP=1 -U postgres -d g3_history \
  -f /tmp/concurrency-session-b.sql >/tmp/concurrency-b.log 2>&1
status_b=$?
wait "$session_a"
status_a=$?
set -e

cat /tmp/concurrency-a.log
cat /tmp/concurrency-b.log

test "$status_a" -eq 0
test "$status_b" -ne 0
grep -q '23505' /tmp/concurrency-b.log

published_count="$(psql -U postgres -d g3_history -Atc \
  "SELECT count(*) FROM offer_versions WHERE offer_id='offer-concurrent-2' AND publication_status='PUBLISHED'")"
test "$published_count" -eq 1

echo 'PASS concurrent publication produced one winner and SQLSTATE 23505 for the loser'
