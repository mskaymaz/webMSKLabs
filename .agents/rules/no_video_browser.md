# Rule: No Video-Controlled Browser Interactions

- **DO NOT USE BROWSER SUBAGENTS / VIDEO RECORDING**: When editing, modifying, or testing web pages in this project, NEVER invoke the `browser_subagent` tool or any video-controlled browser testing flow.
- All page edits, UI/UX fixes, and code modifications must be done directly via file editing tools (`replace_file_content`, `multi_replace_file_content`, `write_to_file`) and verified code logic without launching automated video browser sessions.
