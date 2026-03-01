# Production went down

- “App is down in production – what do you do first?”
- Output: write your investigation process step by step.

---

## Investigation process

#### 1. Verify clearly

Confirm the outage and acknowledge it immediately.
Is the app fully down (HTTP 500 / timeout)?
Is it partially degraded?
Is monitoring alerting correct?

```
Example:
Monitoring (e.g., uptime check or load balancer health check) shows 502 errors. You try accessing the app yourself and confirm it's unreachable.
```

---

#### 2. Identify a scope

This can give a good clue where to start
customer facing issue/my issue/ internal issue etc.
Does it affect all users?
Only certain endpoints?
Only a specific region?
Only authenticated users?
Internal system or customer-facing?

```
Example:
Only /api/orders returns 500, but homepage works fine → likely backend service or database issue.
```

---

#### 3. Communicate to affected people, management/leadership

Notify:

- Team
- Incident channel
- Management (if needed)

Communicate:

- What is happening
- That investigation is ongoing
- When is the next update

---

#### 4. Check obvious things first (Triage)

- Is service running?
- CPU / RAM / disk full?
- Docker container crashed?
- Database reachable?
- Recent deployment that could've caused it?

```
Example:
df -h shows disk 100% full → containers cannot write logs → app crashes.
```

---

#### 5. Identify Root Cause

Differentiate between symptom and root cause
Symptom → “App returns 500”
Root cause → “Database connection string changed and credentials invalid”
**Check application, monitoring logs, deployment history**

```
Example:
Recent deployment added new DB migration but production DB user lacks permissions → SqlException in logs.
```

---

#### 6. Look for a real solution

- Is there a way to solve this long term, ideally not short term
- Short term solutions may cause more outages later (in long run)
- Can we rollback quickly?
- Do we need a hotfix?

```
Example: transaction rollback
USE tempdb;
CREATE TABLE ValueTable
(
    value INT
);

DECLARE @TransactionName AS VARCHAR (20) = 'Transaction1';

BEGIN TRANSACTION @TransactionName;

INSERT INTO ValueTable
VALUES (1), (2);

ROLLBACK TRANSACTION @TransactionName;

INSERT INTO ValueTable
VALUES (3), (4);

SELECT [value]
FROM ValueTable;

DROP TABLE ValueTable;
```

---

#### 7. Deploy the fix safely

- Make sure no checks, reviews, tests are skipped/bypassed for the fix, so it doesnt cause any additional/different problems (In best scenario this would be logged via CI pipeline)
- Confirm that everything is running properly **as intented**, not just "on the paper, it looks good"

---

#### 8. Monitor closely

- Monitor logs
- Monitor error rate
- Monitor CPU/memory
- Confirm user-facing behavior

```
Example:
Errors drop from 100% to 0%
Response time stabilizes
No new error patterns appear
End-user testing shows nothing out of ordinary
```

---

#### 9. Communicate resolution

- Issue resolved
- What caused it
- Monitoring ongoing

```Example
Incident was resolved.
Root cause - missing DB permissions in deployment.
Service restored at 15:00. Monitoring is ongoing.
```

---

#### 10. Document incident, Postmortem

- Timeline
- Root cause
- Impact duration
- Resolution steps
- Detection gaps
- Prevention plan

- Why did this happen?
- Why wasn’t it detected earlier?
- Why wasn’t it prevented?
- Why did it take X minutes to resolve?

```
Example findings:
No test validating DB permissions
No alert on migration failure
Monitoring threshold too high
Team unfamiliar with deployment flow
Misunderstanding of environment differences
Poor knowledge of monitoring tools
Weak understanding of codebase ownership
```

---

#### 11. Implement improvements

- This should come from postmortem

```
Examples:
Add monitoring alerting
Add CI test
Add rollback automation
Improve logging structure
Add health checks
Update escalation contact list
Training for specific tool/codebase knowledge
```

---

**Note: I mentioned it only once, but I think continous communication is important for this type of problem**

**Optional 12th step, if applicable, would be to create a runbook, to document specific process step by step, be it starting, stopping, debugging or troubleshooting a particular system**
