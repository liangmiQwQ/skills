---
name: self-review
description: Load this skill when you are required to handling Codex's review suggestion on GitHub (`@codex review`). Do not load it when you are just handling someone else's review suggestions or just adjusting code according to the prompt.
---

When you are required to resolve Codex's review, you are basically in a loop. I'm not sure where is the start of the loop, maybe you will find users already called `@codex review` for you. And you should continue this loop unless users tell you only fix one turn.

- Submit a comment under the corresponding pull request, the content of the comment is `@codex review`
- Wait for its responding and review suggestions. It usually takes 5-15 minutes, you'd better to check it every minute. If you didn't get the response in one hour, stop and tell the user `timeout`.
- After you get the Codex's response, there can be three different cases. If you get the message that `limitation hit`, stop and tell the user, or if you get the message `Do not find major problem`, and get a thumb up from Codex, stop and do the rest of operations below, if you get review suggestions, just switch to the next step.
- Do not start modify the code immediately, you need to determine whether it is a valid suggestion first. Divide them into three cases. Valid ones: the real bug, might be edge case; Design conflict: the solution to the problem conflicts with the core design direction of the PR; And rest: the suggestions that don't make sense, like considering a config in a hard drive with a poor connection, or a case that two processes modifying the file immediately at completely the same time.
- Make patches and commits to resolve valid ones, then mark them as resolved. Explain design conflict and unreasonable ones, mark unreasonable ones are resolved.
- If you found all of them are completely bullshit, you can treat your work as done, and get into the next part.

After you think you've done the work (like got the thumb up, or find they are all invalid), do a round of simplify, refactor the logic completely and remove duplicated or bad code. And tell the user it's done.
