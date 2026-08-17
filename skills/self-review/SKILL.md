---
name: self-review
description: Load this skill when you are required to handling Codex's review suggestion on GitHub (`@codex review`). Do not load it when you are just handling someone else's review suggestions or just adjusting code according to the prompt.
---

## Before the review

You shouldn't fetch GitHub review suggestions or start to do code change at first. The first task for you is to understand the PR's movitation and design direction.

You can read the PR description, original commit and diff, make sure you completely understand the goal the PR makes. Breaking changes bourdary and features that are explicitly postponed.

If you are in a loop, or in a `goal` mode, you should storage all these things, make sure you can still remember them during your sessions. Keep them in mind.

## Handle the review

When you are required to resolve Codex's review, you are basically in a loop. I'm not sure where is the start of the loop, maybe you will find users already called `@codex review` for you. And you should continue this loop unless users tell you only fix one turn.

- Submit a comment under the corresponding pull request, the content of the comment is `@codex review`
- Wait for its responding and review suggestions. It usually takes 5-15 minutes, you'd better to check it every minute. If you didn't get the response in one hour, stop and tell the user `timeout`.
- After you get the Codex's response, there can be three different cases. If you get the message that `limitation hit`, stop and tell the user that no enough credit, or if you get the message `Didn't find any major issues.`, stop and do the rest of operations below, if you get review suggestions, just switch to the next step.
- Do not start modify the code immediately, you need to determine whether it is a valid suggestion first. Divide them into these cases.
  - True regression: the real regression issue that the PR imports
  - Old problem: the problem that already has before this PR.
  - Defensive edge cases: boundary conditions like broken status and breaking installation
  - Design conflict: the solution to the problem conflicts with the core design direction of the PR. Like things that are explicitly postponed.
- Make patches and commits to resolve valid ones, then mark them as resolved. Explain design conflict, old problems, etc... Mark unreasonable ones are resolved. For defensive edge cases, you shouldn't fix them by default. And then check whether its real trigger, only fix one that will actually happen. To avoid wasting too much effort on hypothetical damage scenarios, you can explain that such situations are practically impossible.
- If you found all of them are completely bullshit, you can treat your work as done, and get into the next part.

There are some cases where you are strictly forbidden to modify the code

- Requires adding mechanisms for ownership, rollback, transactions, repair, or cross-version compatibility
- The fix results in a net increase in code significantly or significantly offsets the code reduction achieved by the original refactoring (If it is a refactor)
- The new finding is a side effect of a fix from the previous review
- The behavior falls under follow-up functionality explicitly deferred in the PR description
- If a review suggestion conflicts with a breaking change, the suggestion should be rejected with an explanation; do not restore compatibility behaviors that were intentionally removed.

You should avoid too many review turns. The bigger the number of turns is, the less trustable the review suggestions are. You can maintain a score system in your own side to control this. Every cost should be made to grow at a quadratic rate.

For example
The first turn: reasonable
The second turn: Okay
The third turn: I hope it is the last (This marks a threshold; beyond this stage, any suggestions should be treated with caution)

You should prevent turns more than 8.

If the PR is exceptionally large, the figures here may be multiplied, but this applies only to large PRs.

## Work after the loop

After you think you've done the work (like got the thumb up, or find they are all invalid), do a round of simplify. Then, review the accumulated diffs, remove unnecessary patches, and avoid introducing new behaviors.

## What you should learn before

Be clear: your goal is not to resolve all review suggestions.

What is your true goal: protect the PR's boundary, protect the PR's goal.

Do not accept Codex review comments by default. A review comment is a hypothesis to be verified, not an acceptance criterion.
